import OpenAI from "openai";
import { IContentModerator } from "../../application/contracts/content-moderator.contract.js";

export const createContentModerator = (client: OpenAI): IContentModerator => {
  const isInappropriate: IContentModerator["isInappropriate"] = async ({
    title,
    content,
  }) => {
    // const response = await client.moderations.create({
    //   model: "omni-moderation-latest",
    //   input: `${title}\n${content}`,
    // });
    // return response.results[0]?.flagged ?? false;

    // api 키 미발급으로 아직 적용되지 않습니다
    return true;
  };

  return { isInappropriate };
};
