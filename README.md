# ⚖️ 잘잘못

> **"이거 누구 잘못인가요?"** — 일상 속 갈등 상황을 올리고, 다수의 시선으로 판단받는 커뮤니티 앱

---

## 🎯 앱 개요

다양한 사람들이 자신의 갈등 상황을 작성하면 **내 잘못 / 상대방 잘못 / 둘 다 잘못 / 잘못 없음** 4가지로 투표받고 직관적인 결과를 확인할 수 있는 서비스입니다.

---

## ✅ 구현된 기능

| 기능 | 설명 |
|------|------|
| 상황 목록 | 카드형 피드, 각 카드에 현재 투표 결과 바 + 판결 뱃지 표시 |
| 카테고리 필터 | 연애 / 직장 / 가족 / 친구 / 기타 / 전체 |
| 정렬 | 최신순 / 투표 많은 순 / 조회 많은 순 |
| 검색 | 실시간 디바운스 검색 (400ms) |
| 상황 상세 | 전체 내용 + 투표 패널 + 결과 바 + 최종 판결 표시 |
| 투표 시스템 | 1인 1회 투표, localStorage 기반 중복 방지 |
| 투표 결과 | 퍼센트 바 + 항목별 득표수 + 최종 판결 메시지 실시간 반영 |
| 상황 작성 | 닉네임/카테고리/제목/내용 입력 후 등록 |
| 댓글 | 상황별 댓글 작성 및 조회 |
| 조회수 | 상세 진입 시 1회 증가 (localStorage 중복 방지) |
| 모바일 반응형 | 전 디바이스 대응 |

---

## 📂 파일 구조

```
index.html         메인 HTML (단일 페이지, 3개 뷰 전환)
css/style.css      전체 스타일
js/app.js          앱 로직 (API 연동, 이벤트, 상태 관리)
README.md          프로젝트 문서
```

---

## 🗄️ 데이터 모델

### `situations` 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | 고유 ID |
| title | text | 상황 제목 |
| content | rich_text | 상황 설명 |
| category | text | 연애/직장/가족/친구/기타 |
| author | text | 닉네임 |
| vote_my_fault | number | 내 잘못 투표수 |
| vote_their_fault | number | 상대방 잘못 투표수 |
| vote_both_fault | number | 둘 다 잘못 투표수 |
| vote_no_fault | number | 잘못 없음 투표수 |
| view_count | number | 조회수 |

### `comments` 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | text | 고유 ID |
| situation_id | text | 연결된 상황 ID |
| author | text | 댓글 작성자 |
| content | text | 댓글 내용 |
| user_agent | text | 사용자 에이전트 |

---

## 🔗 API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| GET | `tables/situations` | 목록 조회 |
| GET | `tables/situations/:id` | 상세 조회 |
| POST | `tables/situations` | 상황 등록 |
| PATCH | `tables/situations/:id` | 투표/조회수 업데이트 |
| GET | `tables/comments` | 댓글 조회 |
| POST | `tables/comments` | 댓글 등록 |

---

## 🚧 미구현 / 추천 개선사항

- [ ] 서버 사이드 카테고리 필터링 (현재 클라이언트 필터)
- [ ] 댓글 삭제 기능
- [ ] 신고/숨기기 기능
- [ ] 공유 기능 (URL 직접 링크)
- [ ] 인기 상황 TOP 10 랭킹
- [ ] 사용자 프로필 / 내가 올린 상황 모아보기
- [ ] 알림 기능 (댓글 달렸을 때)
