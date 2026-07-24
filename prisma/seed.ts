import "dotenv/config";
import bcrypt from "bcrypt";
import { prismaClient } from "../src/outbound/repos/prismaClinet.js";

const SALT_ROUNDS = 10;

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN_NAMES = [
  { kr: "민준", en: "minjun" },
  { kr: "서연", en: "seoyeon" },
  { kr: "도윤", en: "doyoon" },
  { kr: "하은", en: "haeun" },
  { kr: "시우", en: "siwoo" },
  { kr: "지우", en: "jiwoo" },
  { kr: "예준", en: "yejun" },
  { kr: "수아", en: "sooah" },
  { kr: "지호", en: "jiho" },
  { kr: "유나", en: "yuna" },
  { kr: "준서", en: "junseo" },
  { kr: "채원", en: "chaewon" },
  { kr: "우진", en: "woojin" },
  { kr: "다은", en: "daeun" },
  { kr: "성민", en: "sungmin" },
  { kr: "소율", en: "soyul" },
  { kr: "현우", en: "hyunwoo" },
  { kr: "지민", en: "jimin" },
  { kr: "은우", en: "eunwoo" },
  { kr: "나은", en: "naeun" },
  { kr: "재원", en: "jaewon" },
  { kr: "혜진", en: "hyejin" },
  { kr: "동현", en: "donghyun" },
  { kr: "가은", en: "gaeun" },
];
const EMAIL_DOMAINS = [
  "gmail.com",
  "naver.com",
  "kakao.com",
  "hanmail.net",
  "daum.net",
];

const MEMO_TEMPLATES: Record<string, { title: string; content: string }[]> = {
  개발: [
    {
      title: "리액트 훅 정리",
      content:
        "useEffect와 useState를 언제 나눠 써야 하는지 헷갈렸는데, 의존성 배열 기준으로 정리하니 명확해졌다.",
    },
    {
      title: "타입스크립트 제네릭 활용법",
      content:
        "제네릭을 남발하지 말고 실제로 타입이 재사용되는 지점에서만 쓰자. 오늘 리팩토링하며 깨달음.",
    },
    {
      title: "백엔드 아키텍처 학습",
      content:
        "레이어드 아키텍처에서 도메인 로직과 인프라 로직을 분리하는 이유를 실무 코드로 이해했다.",
    },
    {
      title: "데이터베이스 인덱스 튜닝",
      content:
        "복합 인덱스 순서에 따라 쿼리 플랜이 완전히 달라진다는 걸 EXPLAIN ANALYZE로 확인했다.",
    },
    {
      title: "AI API 연동 회고",
      content:
        "OpenAI API를 서비스에 붙일 때는 프롬프트보다 실패 처리와 비용 관리가 더 중요하다는 걸 느꼈다.",
    },
    {
      title: "코드 리뷰에서 배운 것",
      content:
        "함수 하나에 책임을 하나만 두라는 피드백을 받고 나서야 테스트 코드가 훨씬 짧아졌다.",
    },
  ],
  여행: [
    {
      title: "제주도 여행 후기",
      content:
        "3박 4일 동안 렌트카로 서쪽 해안도로를 돌았는데, 애월 카페거리가 제일 기억에 남는다.",
    },
    {
      title: "일본 오사카 맛집 리스트",
      content:
        "도톤보리 근처 라멘집은 웨이팅이 길어도 갈 만했다. 다음엔 교토도 같이 묶어서 가야겠다.",
    },
    {
      title: "국내 캠핑 준비물 체크리스트",
      content:
        "초보 캠핑러라 화로대와 침낭을 새로 샀는데, 생각보다 랜턴이 더 자주 쓰였다.",
    },
    {
      title: "유럽 배낭여행 예산 정리",
      content:
        "3주 유럽 여행 경비를 정리해보니 숙소보다 기차 예매를 미리 안 한 게 제일 큰 지출이었다.",
    },
  ],
  요리: [
    {
      title: "집에서 만드는 김치찌개 레시피",
      content:
        "묵은지와 돼지고기 비율을 3:1로 맞추고 마지막에 들기름을 살짝 넣으니 훨씬 깊은 맛이 났다.",
    },
    {
      title: "에어프라이어 활용 레시피 모음",
      content:
        "냉동 만두부터 감자튀김까지 에어프라이어 온도표를 정리해두니 요리 시간이 훨씬 줄었다.",
    },
    {
      title: "홈베이킹 도전기",
      content:
        "첫 스콘은 반죽을 너무 오래 치대서 딱딱했다. 다음엔 버터를 차갑게 유지하는 게 핵심인 듯.",
    },
  ],
  운동: [
    {
      title: "헬스 3대 운동 기록",
      content:
        "벤치프레스 무게를 서서히 올리고 있는데, 어깨 안정성 운동을 병행하니 부상 걱정이 줄었다.",
    },
    {
      title: "러닝 페이스 기록",
      content: "10km를 55분에 완주했다. 다음 목표는 50분 안쪽으로 들어오는 것.",
    },
    {
      title: "요가 루틴 정리",
      content:
        "아침 15분 요가 루틴을 정해두니 하루 종일 어깨 뭉침이 확실히 덜하다.",
    },
  ],
  독서: [
    {
      title: "이번 달 읽은 책 정리",
      content:
        "소설보다 에세이가 잘 읽히는 시기인 것 같다. 다음엔 경제 관련 책도 한 권 껴봐야겠다.",
    },
    {
      title: "독서 모임 후기",
      content:
        "같은 책을 읽어도 사람마다 인상 깊은 문장이 다르다는 게 독서 모임의 재미인 것 같다.",
    },
  ],
  영화: [
    {
      title: "최근 본 영화 감상평",
      content:
        "예상보다 스토리가 느슨했지만 촬영과 음악만큼은 올해 본 영화 중 최고였다.",
    },
    {
      title: "넷플릭스 드라마 정주행",
      content:
        "주말 내내 정주행했는데 마지막 화 결말이 너무 급하게 끝나서 아쉬웠다.",
    },
  ],
  재테크: [
    {
      title: "이번 달 가계부 결산",
      content:
        "고정비를 줄이려고 구독 서비스를 정리했더니 생각보다 매달 새는 돈이 많았다는 걸 알았다.",
    },
    {
      title: "ETF 분산 투자 공부",
      content:
        "한 종목에 몰빵하지 않고 국가별, 산업별로 나눠서 담는 연습을 하고 있다.",
    },
  ],
  반려동물: [
    {
      title: "강아지 산책 루틴",
      content:
        "저녁 산책 시간을 일정하게 맞췄더니 짖는 횟수가 눈에 띄게 줄었다.",
    },
    {
      title: "고양이 건강검진 후기",
      content:
        "정기검진에서 이상은 없었지만 이제 사료를 저칼로리로 바꿔야 할 나이가 됐다.",
    },
  ],
};

const CATEGORIES = Object.keys(MEMO_TEMPLATES);

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]) => arr[randomInt(0, arr.length - 1)];

const randomPastDate = (maxDaysAgo: number) => {
  const daysAgo = randomInt(0, maxDaysAgo);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
  return date;
};

const buildFakeUsers = (count: number) => {
  const used = new Set<string>();
  const users: {
    email: string;
    username: string;
    password: string | null;
    googleId: string | null;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const surname = pick(SURNAMES);
    const given = pick(GIVEN_NAMES);
    const username = `${surname}${given.kr}`;
    const domain = pick(EMAIL_DOMAINS);
    let email = `${given.en}.${surname === "김" ? "kim" : given.en}${i}@${domain}`;
    while (used.has(email)) {
      email = `${given.en}${randomInt(100, 999)}@${domain}`;
    }
    used.add(email);

    // 약 20%는 구글 연동 계정으로 생성 (비밀번호 없음)
    const isGoogleUser = i % 5 === 0;

    users.push({
      email,
      username,
      password: isGoogleUser ? null : "seed-password-1234",
      googleId: isGoogleUser ? `google-fake-${i}-${Date.now()}` : null,
    });
  }

  return users;
};

const main = async () => {
  console.log("시드 데이터 생성을 시작합니다...");

  // 1. 내 계정 생성 (이미 존재하면 건너뜀)
  const myEmail = "a@a.com";
  const existingMe = await prismaClient.user.findUnique({
    where: { email: myEmail },
  });

  const myHashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
  const me =
    existingMe ??
    (await prismaClient.user.create({
      data: {
        email: myEmail,
        username: "김도윤",
        password: myHashedPassword,
        googleId: null,
      },
    }));
  console.log(`내 계정 준비 완료: ${me.email} (id=${me.id})`);

  // 2. 가짜 유저 대량 생성
  const FAKE_USER_COUNT = 24;
  const fakeUserSpecs = buildFakeUsers(FAKE_USER_COUNT);
  const hashedFakePassword = await bcrypt.hash(
    "seed-password-1234",
    SALT_ROUNDS,
  );

  const fakeUsers = [];
  for (const spec of fakeUserSpecs) {
    const user = await prismaClient.user.create({
      data: {
        email: spec.email,
        username: spec.username,
        password: spec.password ? hashedFakePassword : null,
        googleId: spec.googleId,
      },
    });
    fakeUsers.push(user);
  }
  console.log(`가짜 유저 ${fakeUsers.length}명 생성 완료`);

  const allUsers = [me, ...fakeUsers];

  // 3. 유저별 메모 생성 (유저마다 1~2개의 주요 관심 카테고리를 갖도록 함)
  const articles: { id: number; userId: number }[] = [];

  const createArticlesFor = async (
    userId: number,
    categories: string[],
    countRange: [number, number],
    maxDaysAgo: number,
  ) => {
    const count = randomInt(countRange[0], countRange[1]);
    for (let i = 0; i < count; i++) {
      const category = pick(categories);
      const template = pick(MEMO_TEMPLATES[category]);
      const article = await prismaClient.article.create({
        data: {
          title: template.title,
          content: template.content,
          userId,
          createdAt: randomPastDate(maxDaysAgo),
        },
      });
      articles.push({ id: article.id, userId: article.userId });
    }
  };

  // 내 계정은 개발/여행 위주로 최근 활동 흔적을 남김
  await createArticlesFor(me.id, ["개발", "여행"], [6, 6], 30);

  for (const user of fakeUsers) {
    const mainCategories = [pick(CATEGORIES), pick(CATEGORIES)];
    await createArticlesFor(user.id, mainCategories, [3, 9], 180);
  }
  console.log(`메모 ${articles.length}개 생성 완료`);

  // 4. 추천(좋아요) 랜덤 생성
  let recommendCount = 0;
  for (const article of articles) {
    const candidateUsers = allUsers.filter((u) => u.id !== article.userId);
    for (const user of candidateUsers) {
      if (Math.random() < 0.15) {
        try {
          await prismaClient.userRecommendArticle.create({
            data: { userId: user.id, articleId: article.id },
          });
          recommendCount++;
        } catch {
          // 유니크 제약 충돌 시 무시
        }
      }
    }
  }
  console.log(`추천 ${recommendCount}건 생성 완료`);

  console.log("시드 데이터 생성이 완료되었습니다.");
  console.log(`로그인 계정: ${myEmail} / 비밀번호: 1234`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
