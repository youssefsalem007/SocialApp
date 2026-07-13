export const emailTemplate = ({ userName, otp }:{userName:string, otp: string}):string => `

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Confirmation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.85); margin-top: 6px; font-size: 14px; }
    .body { padding: 40px 36px; }
    .greeting { font-size: 18px; color: #333; margin-bottom: 16px; }
    .message { color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
    .otp-container { background: #f0f0ff; border: 2px dashed #667eea; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 32px; }
    .otp-label { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .otp-code { font-size: 42px; font-weight: 700; color: #667eea; letter-spacing: 10px; }
    .otp-expiry { font-size: 13px; color: #999; margin-top: 10px; }
    .warning { background: #fff8e1; border-left: 4px solid #ffc107; padding: 14px 18px; border-radius: 4px; font-size: 13px; color: #7a6000; margin-bottom: 32px; }
    .footer { background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #eee; }
    .footer p { color: #aaa; font-size: 12px; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Social App</h1>
      <p>Email Verification</p>
    </div>

    <div class="body">
      <p class="greeting">Hey ${userName} 👋</p>
      <p class="message">
        Thanks for signing up! Use the OTP below to verify your email address and activate your account.
      </p>

      <div class="otp-container">
        <p class="otp-label">Your One-Time Password</p>
        <p class="otp-code">${otp}</p>
        <p class="otp-expiry">⏳ Expires in 2 minutes</p>
      </div>

      <div class="warning">
        ⚠️ Never share this OTP with anyone. Saraha App will never ask for your OTP.
      </div>

      <p class="message">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Saraha App. All rights reserved.</p>
      <p>This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`