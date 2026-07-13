import { confirmEmailDto, LoginDto, resendOtpDto, SignupDto } from "./auth.dto"
import { IUser } from "../../common/interfaces"
import { BadRequestException, ConflictException, NotFoundException } from './../../common/exceptions';
import { UserRepository } from "../../DB/repository";
import { compareHash, generateHash } from "../../common/utils/security";
import { emailTemplate, sendEmail } from "../../common/utils/email/";
import { redisService, RedisService, TokenService } from "../../common/service";
import { EmailEnum, ProviderEnum } from "../../common/enums";
import { SALT_ROUNDS, SECRET_KEY } from "../../config/config";
import { generateOtp } from "../../common/utils/otp";
import { ILoginResponse } from "./auth.entity";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { CLIENT_ID } from './../../config/config';
import { notificationService, NotificationService } from './../../common/service/notification.service';




class Authenticationservice{
    private readonly userRepository: UserRepository
    private readonly redis: RedisService
    private readonly tokenService: TokenService
    private readonly notification: NotificationService
    constructor(){
        this.userRepository = new UserRepository()
        this.redis = redisService
        this.tokenService = new TokenService()
        this.notification = notificationService
    }

    public async login ({email, password, FCM}: LoginDto, issuer: string):Promise<ILoginResponse>{
      

      const user = await this.userRepository.findOne({
        filter:{
          email,
          provider: ProviderEnum.SYSTEM,
          confirmEmail: {$exists: true}
        }
      })

      if(!user){
        throw new BadRequestException('Invalid Login Credentials')
      }

      if(!await compareHash({plainText: password, cipherText: user.password})){
        throw new BadRequestException('Invalid Login Credentials')
      }
      if (FCM) {
        await this.redis.addFCM(user._id, FCM)
        const tokens = await this.redis.getFCMs(user._id)

        if (tokens?.length) {
            await this.notification.sendNotifications({tokens, data:{title: "Login", body: `new login at ${new Date()}`}})
        }
      
      }

      return await this.tokenService.createLoginCredentials(user, issuer)
    }

    private async sendEmailOtp({ email, userName, subject } : {email: string, userName: string, subject: EmailEnum})   {
      const isBlocked = await this.redis.ttl(this.redis.block_otp_key({ email }) );
      if (isBlocked > 0) {
        throw new BadRequestException(
          `you are blocked from resend otp please wait ${isBlocked} seconds`,
          { cause: 400 },
        );
      }
    
      const otp_ttl = await this.redis.ttl(this.redis.otp_key({ email, subject }) );
      if (otp_ttl > 0) {
        throw new BadRequestException(`otp not expired please wait ${otp_ttl} seconds`, {
          cause: 400,
        });
      }
    
      const max_otp = await this.redis.get( this.redis.max_otp_key({ email }) );
      if (max_otp >= 3) {
        await this.redis.set({
          key: this.redis.block_otp_key({ email }),
          value: 1,
          ttl: 60,
        });
        await this.redis.deletekey(this.redis.max_otp_key({ email }) );
        throw new BadRequestException("max otp reached", { cause: 400 });
      }
    
      const otp =  generateOtp();
     
        await sendEmail({
          to: email,
          subject: "Welcome to Social App",
          html: emailTemplate({ userName, otp }),
        });
    
        await this.redis.set({
          key: this.redis.otp_key({ email, subject }),
          value: await generateHash({ plainText: otp.toString(), salt: SALT_ROUNDS }),
          ttl: 60,
        });
        await this.redis.incr(this.redis.max_otp_key({ email }));
      
    };

     public async signup ({email, userName, password, phone}: SignupDto):Promise<IUser> {

        const checkUserExist = await this.userRepository.findOne({
            filter: {email},
            projection: "email",
            options:{lean:true}
        })

        

        if(checkUserExist){
   
        throw new ConflictException("email exist")
        }
           
        const user = await this.userRepository.createOne({
            data:{
                email,
                userName,
                password,
                phone: phone as string
                }
                  
        })
       
        if(!user){
            throw new BadRequestException("fail") 

        }

        await this.sendEmailOtp({email, userName, subject:EmailEnum.CONFIRM_EMAIL})
       
        return user.toJSON()
    }

    public async confirmEmail  ({email, otp}:confirmEmailDto)  {
  
      const hashOtp = await this.redis.get(this.redis.otp_key({email, subject: EmailEnum.CONFIRM_EMAIL}))
     
      
      if(!hashOtp){
      throw new NotFoundException("expired otp")
      }

  const user = await this.userRepository.findOne({
    filter: { email, confirmEmail:{$exists: false}, provider: ProviderEnum.SYSTEM},
  });
  if (!user) {
    throw new NotFoundException("user not exist");
  }


  if (! await compareHash({ plainText: otp, cipherText: hashOtp })) {
    throw new ConflictException("invalid otp");
  }

  user.confirmEmail = new Date()
  await user.save()


  await this.redis.deletekey(this.redis.otp_key({ email, subject: EmailEnum.CONFIRM_EMAIL }) );

  return
};

public async resendOtp({email}: resendOtpDto) {

  const user = await this.userRepository.findOne({
    
    filter: { email, confirmEmail: {$exists: false}, provider: ProviderEnum.SYSTEM },
  });

  if (!user) {
    throw new Error("user not exist", { cause: 404 });
  }


  await this.sendEmailOtp({
    email,
    userName: user.userName as string,
    subject: EmailEnum.CONFIRM_EMAIL,
  });
  return

};

public signUpWithGmail = async (idToken: string): Promise<{ access_token: string }> => {
  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience: CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new BadRequestException("invalid google token");

  const { email, email_verified, name, picture } = payload;
  if (!email) throw new NotFoundException("email not found");

  let user = await this.userRepository.findOne({ filter: { email } });

  if (!user) {
    user = await this.userRepository.createOne({
      data: {
        email,
        confirmEmail: email_verified ? new Date() : undefined,
        userName: name,
        profilePicture: picture,
        provider: ProviderEnum.GOOGLE,
      },
    });
  }

  if (user.provider === ProviderEnum.SYSTEM) {
    throw new BadRequestException("please login on system only");
  }

  const access_token = await this.tokenService.sign({
    payload: { sub: user._id },
    secret: SECRET_KEY,
    options: { expiresIn: 60 * 3, jwtid: randomUUID() },
  });

  return { access_token };
};

}

export default new Authenticationservice() 