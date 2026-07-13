import{ NextFunction, Request, Response, Router } from "express";
import { authentication, validation } from './../../middleware';
import { cloudFileUpload } from './../../common/utils/multer/cloud.multer';
import { fileFieldValidation } from "../../common/utils/multer";
import { successResponse } from './../../common/response/success.response';
import * as validators from './post.validation'
import { postService } from "./post.service";
import { PaginateDto, paginationValidationSchema } from "../../common/validation";
import { ReactPostParamsDto, ReactPostQueryDto, UpdatePostBodyDto, UpdatePostParamsDto } from "./post.dto";
import { commentRouter } from "../comment";


const router = Router()
router.use('/:postId/comment', commentRouter)

router.post(
    "/",
    authentication,
    cloudFileUpload({ validation: fileFieldValidation.image }).array("attachments", 2),
    validation(validators.createPost),
    async (req: Request, res: Response, next: NextFunction) =>{
        const data = await postService.createPost({...req.body, files: req.files}, req.user)
        return successResponse({res, status: 201, data})
    }
)

router.get(
    "/",
    authentication,
    validation(paginationValidationSchema),
    async (req: Request, res: Response, next: NextFunction) =>{
        const data = await postService.postList(req.query as PaginateDto, req.user)
        return successResponse({res, status: 201, data})
    }
    
    
)

router.patch(
    "/:postId/react",
    authentication,
    validation(validators.reactPost),
    async (req: Request, res: Response, next: NextFunction) =>{
        const data = await postService.reactPost(req.params as ReactPostParamsDto, req.query as unknown as ReactPostQueryDto, req.user)
        return successResponse({res, status: 200, data})
    }
)

router.patch(
    "/:postId",
    authentication,
    cloudFileUpload({ validation: fileFieldValidation.image }).array("attachments", 2),
    validation(validators.updatePost),
    async (req: Request, res: Response, next: NextFunction) =>{
        const data = await postService.updatePost(req.params as UpdatePostParamsDto, req.body as UpdatePostBodyDto, req.user)
        return successResponse({res, status: 200, data})
    }
)

export default router