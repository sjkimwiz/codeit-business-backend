# Prisma

1. 설치

- prisma
  - npm install prisma
  - 마이그레이션: 개발 단계에서 스키마와 데이터베이스를 동기화하는 작업
    - npx prisma migrate dev
  - 제너레이트: 프리즈마 클라이언트가 데이터베이스와 상호작용하기 위해서 생성되는 파일
    - npx prisma generate

- @prisma/client
  - npm install @prisma/client
  - 데이터베이스에 다양한 요청을 보낼 수 있게 해주는 라이브러리
