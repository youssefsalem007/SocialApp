"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exceptions_1 = require("./../../common/exceptions");
const repository_1 = require("../../DB/repository");
const security_1 = require("../../common/utils/security");
const email_1 = require("../../common/utils/email/");
const service_1 = require("../../common/service");
const enums_1 = require("../../common/enums");
const config_1 = require("../../config/config");
const otp_1 = require("../../common/utils/otp");
const node_crypto_1 = require("node:crypto");
const google_auth_library_1 = require("google-auth-library");
const config_2 = require("./../../config/config");
const notification_service_1 = require("./../../common/service/notification.service");
class Authenticationservice {
    userRepository;
    redis;
    tokenService;
    notification;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.redis = service_1.redisService;
        this.tokenService = new service_1.TokenService();
        this.notification = notification_service_1.notificationService;
    }
    async login({ email, password, FCM }, issuer) {
        const user = await this.userRepository.findOne({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true }
            }
        });
        if (!user) {
            throw new exceptions_1.BadRequestException('Invalid Login Credentials');
        }
        if (!await (0, security_1.compareHash)({ plainText: password, cipherText: user.password })) {
            throw new exceptions_1.BadRequestException('Invalid Login Credentials');
        }
        if (FCM) {
            await this.redis.addFCM(user._id, FCM);
            const tokens = await this.redis.getFCMs(user._id);
            if (tokens?.length) {
                await this.notification.sendNotifications({ tokens, data: { title: "Login", body: `new login at ${new Date()}` } });
            }
        }
        return await this.tokenService.createLoginCredentials(user, issuer);
    }
    async sendEmailOtp({ email, userName, subject }) {
        const isBlocked = await this.redis.ttl(this.redis.block_otp_key({ email }));
        if (isBlocked > 0) {
            throw new exceptions_1.BadRequestException(`you are blocked from resend otp please wait ${isBlocked} seconds`, { cause: 400 });
        }
        const otp_ttl = await this.redis.ttl(this.redis.otp_key({ email, subject }));
        if (otp_ttl > 0) {
            throw new exceptions_1.BadRequestException(`otp not expired please wait ${otp_ttl} seconds`, {
                cause: 400,
            });
        }
        const max_otp = await this.redis.get(this.redis.max_otp_key({ email }));
        if (max_otp >= 3) {
            await this.redis.set({
                key: this.redis.block_otp_key({ email }),
                value: 1,
                ttl: 60,
            });
            await this.redis.deletekey(this.redis.max_otp_key({ email }));
            throw new exceptions_1.BadRequestException("max otp reached", { cause: 400 });
        }
        const otp = (0, otp_1.generateOtp)();
        await (0, email_1.sendEmail)({
            to: email,
            subject: "Welcome to Social App",
            html: (0, email_1.emailTemplate)({ userName, otp }),
        });
        await this.redis.set({
            key: this.redis.otp_key({ email, subject }),
            value: await (0, security_1.generateHash)({ plainText: otp.toString(), salt: config_1.SALT_ROUNDS }),
            ttl: 60,
        });
        await this.redis.incr(this.redis.max_otp_key({ email }));
    }
    ;
    async signup({ email, userName, password, phone }) {
        const checkUserExist = await this.userRepository.findOne({
            filter: { email },
            projection: "email",
            options: { lean: true }
        });
        if (checkUserExist) {
            throw new exceptions_1.ConflictException("email exist");
        }
        const user = await this.userRepository.createOne({
            data: {
                email,
                userName,
                password,
                phone: phone
            }
        });
        if (!user) {
            throw new exceptions_1.BadRequestException("fail");
        }
        await this.sendEmailOtp({ email, userName, subject: enums_1.EmailEnum.CONFIRM_EMAIL });
        return user.toJSON();
    }
    async confirmEmail({ email, otp }) {
        const hashOtp = await this.redis.get(this.redis.otp_key({ email, subject: enums_1.EmailEnum.CONFIRM_EMAIL }));
        if (!hashOtp) {
            throw new exceptions_1.NotFoundException("expired otp");
        }
        const user = await this.userRepository.findOne({
            filter: { email, confirmEmail: { $exists: false }, provider: enums_1.ProviderEnum.SYSTEM },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("user not exist");
        }
        if (!await (0, security_1.compareHash)({ plainText: otp, cipherText: hashOtp })) {
            throw new exceptions_1.ConflictException("invalid otp");
        }
        user.confirmEmail = new Date();
        await user.save();
        await this.redis.deletekey(this.redis.otp_key({ email, subject: enums_1.EmailEnum.CONFIRM_EMAIL }));
        return;
    }
    ;
    async resendOtp({ email }) {
        const user = await this.userRepository.findOne({
            filter: { email, confirmEmail: { $exists: false }, provider: enums_1.ProviderEnum.SYSTEM },
        });
        if (!user) {
            throw new Error("user not exist", { cause: 404 });
        }
        await this.sendEmailOtp({
            email,
            userName: user.userName,
            subject: enums_1.EmailEnum.CONFIRM_EMAIL,
        });
        return;
    }
    ;
    signUpWithGmail = async (idToken) => {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: config_2.CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload)
            throw new exceptions_1.BadRequestException("invalid google token");
        const { email, email_verified, name, picture } = payload;
        if (!email)
            throw new exceptions_1.NotFoundException("email not found");
        let user = await this.userRepository.findOne({ filter: { email } });
        if (!user) {
            user = await this.userRepository.createOne({
                data: {
                    email,
                    confirmEmail: email_verified ? new Date() : undefined,
                    userName: name,
                    profilePicture: picture,
                    provider: enums_1.ProviderEnum.GOOGLE,
                },
            });
        }
        if (user.provider === enums_1.ProviderEnum.SYSTEM) {
            throw new exceptions_1.BadRequestException("please login on system only");
        }
        const access_token = await this.tokenService.sign({
            payload: { sub: user._id },
            secret: config_1.SECRET_KEY,
            options: { expiresIn: 60 * 3, jwtid: (0, node_crypto_1.randomUUID)() },
        });
        return { access_token };
    };
}
exports.default = new Authenticationservice();
