import OpenAI from "openai";
import { IInterestAnalyzer } from "../../application/contracts/interest-analyzer.contract.js";

export const createInterestAnalyzer = (client: OpenAI): IInterestAnalyzer => {
  const analyze: IInterestAnalyzer["analyze"] = async (memos) => {
    // 메모 목록을 프롬프트용 텍스트로 변환
    const memosText = memos
      .map((memo, index) => `${index + 1}. ${memo.title}\n${memo.content}`)
      .join("\n\n");

    // const response = await client.responses.create({
    //   model: "gpt-4o-mini",
    //   input: [
    //     {
    //       role: "system",
    //       content:
    //         "사용자가 작성한 메모를 바탕으로 관심사와 추천 관심사를 분석해서, 100자 이내의 한국어 문장 하나로만 답한다.",
    //     },
    //     { role: "user", content: memosText },
    //   ],
    // });

    // return response.output_text.trim();
    return "api 키 미발급으로 아직 적용되지 않습니다";
  };

  return { analyze };
};
