import Router, { NextFunction, Request, Response } from 'express'
import { successResponse } from '../../common/response/success.response'
import userService from './user.service'
import { authentication, authorization } from '../../middleware'
import { endPoint } from './user.authorization'
import { cloudFileUpload } from '../../common/utils/multer/cloud.multer'
import { fileFieldValidation } from '../../common/utils/multer/validation.multer'
import { StorageApproachEnum } from '../../common/enums/multer.enum'
import { chatRouter } from '../chat/index'


const router = Router()
router.use("/:userId/chat", chatRouter)

router.patch("/profile-image", authentication, 
async(req: Request, res: Response, next: NextFunction)=>{
   const data = await userService.profileImage(req.body, req.user)
    return successResponse({res, data})
})

router.patch("/profile-cover-image", authentication, 
     cloudFileUpload({
     validation: fileFieldValidation.image,
     storageApproach: StorageApproachEnum.DISK
     }).array("attachments", 2),
async(req: Request, res: Response, next: NextFunction)=>{
   const data = await userService.profileCoverImage(req.files as Express.Multer.File[], req.user)
    return successResponse({res, data})
})

router.get("/", authentication, authorization(endPoint.profile), async(req: Request, res: Response, next: NextFunction)=>{
    const data = await userService.profile(req.user)
    return successResponse({res, data})
})

router.post("/logout", authentication, async(req: Request, res: Response, next: NextFunction)=>{
     await userService.logout(req, res, next);

    return successResponse({ res});
})

router.post("/refresh-token", async(req: Request, res: Response, next: NextFunction)=>{
     await userService.refresh_token(req, res, next);

})

router.delete("/", authentication, 
   
async(req: Request, res: Response, next: NextFunction)=>{
   const data = await userService.deleteProfile(req.user)
    return successResponse({res, data})
})

export default router