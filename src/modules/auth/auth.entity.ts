export interface ILoginResponse{
  access_token: string, refresh_token: string
}

export interface ISignupResponse extends ILoginResponse{
  userName:string,
  _id:string
}