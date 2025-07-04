import Plan from '../models/Plan.js';
import Conversation from '../models/Conversation.js';
import { generateSessionId } from '../utils/helpers.js';
import { generateComparePrompt } from '../services/promptService.js';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
/**
 * 요금제 목록 전체를 조회
 */
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.json(plans);
  } catch (error) {
    console.error('요금제 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

/**
 * IP와 User Agent를 기반으로 대화 기록을 조회
 */
export const getConversationByIp = async (req, res) => {
  try {
    const clientIP = req.params.ip;
    const userAgent = req.headers['user-agent'] || '';
    const sessionId = generateSessionId(clientIP, userAgent);

    const conversation = await Conversation.findOne({ sessionId });

    if (conversation) {
      res.json({
        sessionId: sessionId,
        messages: conversation.messages,
        metadata: conversation.metadata,
      });
    } else {
      res.json({
        sessionId: sessionId,
        messages: [],
        metadata: null,
      });
    }
  } catch (error) {
    console.error('대화 가져오기 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// 세션기반 대화 가져오기
export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      sessionId: req.params.sessionId,
    });
    if (conversation) {
      res.json(conversation.messages);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('대화 가져오기 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

// --- Admin Controller ---
export const getAdminStats = async (req, res) => {
  try {
    const totalConversations = await Conversation.countDocuments();
    const activeToday = await Conversation.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    res.json({
      totalConversations,
      activeToday,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

/**
 * 서버의 상태를 체크
 */
export const checkHealth = (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
};

// AI를 이용한 요금제 비교
export const comparePlansByAI = async (req, res) => {
  try {
    const { plans } = req.body;

    if (!plans || plans.length !== 2) {
      return res
        .status(400)
        .json({ error: '비교를 위해 정확히 2개의 요금제가 필요합니다.' });
    }

    // AI에게 전달할 프롬프트를 생성
    const comparePrompt = generateComparePrompt(plans);

    // OpenAI에 요청 (스트리밍 X)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'system', content: comparePrompt }],
      temperature: 0.5,
    });

    const summary =
      completion.choices[0]?.message?.content ||
      '비교 요약을 생성하는 데 실패했습니다.';

    res.json({ summary });
  } catch (error) {
    console.error('AI 요금제 비교 오류:', error);
    res
      .status(500)
      .json({ error: 'AI 비교 요약 생성 중 서버 오류가 발생했습니다.' });
  }
};
