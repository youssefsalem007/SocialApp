import{ NextFunction, Request, Response, Router } from "express";
import { authentication, validation } from '../../middleware';
import { cloudFileUpload } from '../../common/utils/multer/cloud.multer';
import { fileFieldValidation } from "../../common/utils/multer";
import { successResponse } from '../../common/response/success.response';
import * as validators from './comment.validation'
import { commentService } from "./comment.service";
import { CreateCommentParamsDto, ReplyOnCommentParamsDto } from "./comment.dto";
import { IComment } from "../../common/interfaces";


const router = Router({mergeParams: true})

router.post(
    "/",
    authentication,
    cloudFileUpload({ validation: fileFieldValidation.image }).array("attachments", 2),
    validation(validators.createComment),
    async (req: Request, res: Response, next: NextFunction) =>{
        const data = await commentService.createComment(req.params as CreateCommentParamsDto, {...req.body, files: req.files}, req.user)
        return successResponse<IComment>({res, status: 201, data})
    }
)

router.post(
    "/:commentId/reply",
    authentication,
    cloudFileUpload({ validation: fileFieldValidation.image }).array("attachments", 2),
    validation(validators.replyOnComment),
    async (req: Request, res: Response, next: NextFunction) =>{
        const data = await commentService.replyOnComment(req.params as ReplyOnCommentParamsDto, {...req.body, files: req.files}, req.user)
        return successResponse<IComment>({res, status: 201, data})
    }
)



export default router