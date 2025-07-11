import dotenv from 'dotenv';
dotenv.config();

export const kakaoConfig = {
  clientID: process.env.KAKAO_CLIENT_ID,
  clientSecret: process.env.KAKAO_CLIENT_SECRET,
  callbackURI: process.env.KAKAO_CALLBACK_URI,
};
