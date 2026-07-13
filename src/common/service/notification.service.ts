import admin from 'firebase-admin'
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';


export class NotificationService {
    private client : admin.app.App
  constructor() {
    var serviceAccount = JSON.parse(readFileSync(resolve("./src/config/social-app-b3159-firebase-adminsdk-fbsvc-c2505ce728.json")) as unknown as string)

   this.client = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  async sendNotification({
    token,
    data
  }:{
    token:  string,
    data: {title: string, body: string}
  }){
 
    const message = {
        token,
        data
    }
    return await this.client.messaging().send(message)
  }

  async sendNotifications({
    tokens,
    data
  }:{
    tokens:  string[],
    data: {title: string, body: string}
  }){
 

    await Promise.allSettled(
        tokens.map(token =>{
            return this.sendNotification({token, data})
        })
    )
  }
}

export const notificationService = new NotificationService()
