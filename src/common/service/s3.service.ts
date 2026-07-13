import { CompleteMultipartUploadCommandOutput, DeleteObjectCommand, DeleteObjectCommandOutput, DeleteObjectsCommand, DeleteObjectsCommandOutput, GetObjectCommand, GetObjectCommandOutput, ListObjectsV2Command, ListObjectsV2CommandOutput, ObjectCannedACL, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { APPLICATION_NAME, AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_REGION, AWS_SECRET_ACCESS_KEY, AWS_EXPIRES_IN } from "../../config/config";
import { randomUUID } from "node:crypto";
import { BadRequestException } from './../exceptions/domain.exception';
import { StorageApproachEnum, UploadApproachEnum } from "../enums/multer.enum";
import { createReadStream } from "node:fs";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


 

export class S3Service {
    private client : S3Client
    constructor(){
        this.client = new S3Client({
            region: AWS_REGION,
            credentials:{
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY
            }
        })
    }

    async uploadAsset({
        storageApproach= StorageApproachEnum.MEMEORY,
        Bucket= AWS_BUCKET_NAME,
        path = "general",
        file,
        ACL = ObjectCannedACL.private,
        ContentType

    }:{
        storageApproach?: StorageApproachEnum,
        Bucket?: string,
        path?: string,
        file: Express.Multer.File,
        ACL?: ObjectCannedACL,
        ContentType?: string | undefined

    }):Promise<string>{

        const command = new PutObjectCommand({
            Bucket,
            Key: `${APPLICATION_NAME}/${path}/${randomUUID()}__${file.originalname}`,
            ACL,
            Body: storageApproach == StorageApproachEnum.MEMEORY? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype || ContentType
        })
        if (!command.input?.Key) {
            throw new BadRequestException("Fail to upload this asset")
        }
        await this.client.send(command)
        
        return command.input?.Key
    }

      async uploadLargeAsset({
        storageApproach= StorageApproachEnum.DISK,
        Bucket= AWS_BUCKET_NAME,
        path = "general",
        file,
        ACL = ObjectCannedACL.private,
        ContentType,
        partSize = 5

    }:{
        storageApproach?: StorageApproachEnum,
        Bucket?: string,
        path?: string,
        file: Express.Multer.File,
        ACL?: ObjectCannedACL,
        ContentType?: string | undefined,
        partSize?: number

    }):Promise<CompleteMultipartUploadCommandOutput>{

        const uploadFile = new Upload({
            client: this.client,
            params:{
            Bucket,
            Key: `${APPLICATION_NAME}/${path}/${randomUUID()}__${file.originalname}`,
            ACL,
            Body: storageApproach == StorageApproachEnum.MEMEORY? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype || ContentType
            },
            partSize: partSize * 1024 * 1024
        })

     uploadFile.on("httpUploadProgress", (progress)=>{
        console.log(progress);
        console.log(`file upload is ${(progress.loaded as number)/ (progress.total as number) * 100} %`);
         })
     return await uploadFile.done()

     
    }
     
    async uploadAssets({
        storageApproach = StorageApproachEnum.MEMEORY,
        uploadApproach = UploadApproachEnum.SMALL,
        Bucket= AWS_BUCKET_NAME,
        path = "general",
        files,
        ACL = ObjectCannedACL.private,
        ContentType

    }:{
        storageApproach?: StorageApproachEnum,
        uploadApproach?: UploadApproachEnum,
        Bucket?: string,
        path?: string,
        files: Express.Multer.File[],
        ACL?: ObjectCannedACL,
        ContentType?: string

    }):Promise<string[]>{

        let urls: string[] = []
        
        if (uploadApproach == UploadApproachEnum.LARGE) {
            const data = await Promise.all(
            files.map((file)=>{
                return this.uploadLargeAsset({
                    storageApproach,
                    file,
                    ACL,
                    Bucket,
                    ContentType,
                    path
                })
            })
        )
        urls = data.map(ele => ele.Key as  string)
        } else {
           const data = await Promise.all(
            files.map((file)=>{
                return this.uploadAsset({
                    storageApproach,
                    file,
                    ACL,
                    Bucket,
                    ContentType,
                    path
                })
            })
        )
        urls = data
        }
        

        return urls

    }   
    
     async createPreSignedUploadLink({
        Bucket= AWS_BUCKET_NAME,
        path = "general",
        ContentType,
        Originalname,
        expiresIn = AWS_EXPIRES_IN
    }:{
        Bucket?: string,
        path?: string,
        ContentType: string
        Originalname: string,
        expiresIn?: number
    }):Promise<{url: string, Key: string}>{

        const command = new PutObjectCommand({
            Bucket,
            Key: `${APPLICATION_NAME}/${path}/${randomUUID()}__${Originalname}`,
            ContentType
        })

        if (!command.input?.Key) {
            throw new BadRequestException("Fail to upload this asset")
        } 

        const url = await getSignedUrl(this.client, command, {expiresIn})
        return {url, Key: command.input.Key}
   
    }

    async createPreSignedFetchLink({
        Bucket= AWS_BUCKET_NAME,
        Key,
        expiresIn = AWS_EXPIRES_IN,
        fileName,
        download
    }:{
        Bucket?: string,
        Key: string,
        expiresIn?: number,
        fileName?: string,
        download?: string
    }):Promise<string>{

        const command = new GetObjectCommand({
            Bucket,
            Key,
            ResponseContentDisposition: download === "true" ? `attachment; filename="${fileName || Key.split("/").pop()}"` : undefined
        })

        const url = await getSignedUrl(this.client, command, {expiresIn})
        return url
   
    }

     async getAsset({
        Bucket= AWS_BUCKET_NAME,
        Key
    }:{
        Bucket?: string,
        Key: string
    }):Promise<GetObjectCommandOutput>{

        const command = new GetObjectCommand({
            Bucket,
            Key
        })
       
      return await this.client.send(command)
        
    }

     async deleteAsset({
        Bucket= AWS_BUCKET_NAME,
        Key
    }:{
        Bucket?: string,
        Key: string
    }):Promise<DeleteObjectCommandOutput>{

        const command = new DeleteObjectCommand({
            Bucket,
            Key
        })
       
      return await this.client.send(command)
        
    }

      async deleteAssets({
        Bucket= AWS_BUCKET_NAME,
        Keys
    }:{
        Bucket?: string,
        Keys: { Key: string}[]
    }):Promise<DeleteObjectsCommandOutput>{

        const command = new DeleteObjectsCommand({
            Bucket,
            Delete:{
                Objects: Keys,
                Quiet: false

            }
        })
       
      return await this.client.send(command)
        
    }

       async listFolderDir({
        Bucket= AWS_BUCKET_NAME,
        Prefix
    }:{
        Bucket?: string,
        Prefix: string
    }):Promise<ListObjectsV2CommandOutput>{

        const command = new ListObjectsV2Command({
            Bucket,
            Prefix: `${APPLICATION_NAME}/${Prefix}`
        })
       
      return await this.client.send(command)
        
    }

     async deleteFolderByPrefix({
        Bucket= AWS_BUCKET_NAME,
        Prefix
    }:{
        Bucket?: string,
        Prefix: string
    }):Promise<DeleteObjectsCommandOutput>{

        const result = await this.listFolderDir({Bucket, Prefix})
        const Keys = result.Contents?.map(ele=> {return {Key: ele.Key}}) as {Key : string} []
        return await this.deleteAssets({Bucket, Keys})
        
    }
} 

export const s3Service = new S3Service()