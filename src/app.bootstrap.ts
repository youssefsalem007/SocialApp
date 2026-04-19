import express from "express"
import { authRouter } from "./modules"




const bootstrap = ()=>{

    const app: express.Express = express()
    
    app.use(express.json())

    app.get("/", (req: express.Request, res:express.Response, next: express.NextFunction): express.Response =>{
        return res.status(200).json({message : "welcome to social app"})
    })

    //application-routing
    app.use("/auth", authRouter)

    app.get("/*dummy", (req: express.Request, res: express.Response, next: express.NextFunction):express.Response  =>{
       return res.status(404).json({message: "invalid routing"})
    })

    app.listen(3000, ()=>{
        console.log(`server is runnint on port 3000`); 
        
    })
    
    
}

export default bootstrap