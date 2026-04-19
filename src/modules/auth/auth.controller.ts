import {NextFunction, Request, Response, Router} from "express"
import authService from "./auth.service.js"



const router = Router()

router.post("/login", (req: Request, res: Response, next: NextFunction): Response=>{

    const data = authService.login(req.body)
    return res.status(201).json({message: " done-login", data})

})

export default router