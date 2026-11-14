# Frontend

카메라로 운동 자세를 추적하고 결과를 보여 주는 웹앱. 백엔드 저장소는 [hackathon-1114/backend](https://github.com/hackathon-1114/backend).

## 먼저 읽을 것

- [기능별 구현과 한계](https://github.com/hackathon-1114/backend/blob/master/docs/features.md): 화면마다 어떤 API를 부르는지, 각 기능이 어디까지 믿을 만한지
- [자세 감지 검증 기록](https://github.com/hackathon-1114/backend/blob/master/docs/verification.md): 무엇이 확인됐고 무엇이 확인되지 않았는지

## 화면과 API

| 화면 | API |
|---|---|
| 사용자 문진 | `POST /api/surveys`, `GET /api/surveys/latest` |
| 인바디 분석 | `POST /api/inbody` (사진 또는 수치), `GET /api/inbody` |
| AI 카메라 인식 | 없음. 브라우저 안에서 MediaPipe로 처리 |
| 카메라 인식 후 결과 | `POST /api/sets` (통계가 바로 옴), `POST /api/sets/{id}/feedback` (AI 설명, 3~13초) |
| 발생 가능 문제 제안 | `POST /api/insights/analyze` (약 12초), `GET /api/insights` |

- 정확한 요청과 응답 모양은 백엔드 서버의 `/swagger-ui.html` 에서 본다
- 응답은 항상 `{ "success", "code", "message", "data" }` 모양이다
- 로그인은 없다. 유저 구분은 `X-User-Id` 헤더로 한다 (없으면 1). 유저 1에는 시연용 데이터가 들어 있다
- CORS는 전체 허용이다
- AI가 들어가는 호출은 몇 초씩 걸린다. 통계를 먼저 보여 주고 AI 설명은 나중에 채운다

## 가져다 쓸 코드

백엔드 저장소의 `src/main/resources/static/` 에 동작하는 예제가 있다.

| 파일 | 내용 |
|---|---|
| `pose-test.html` | MediaPipe로 관절을 추적해 스쿼트 횟수, 깊이, 상체 기울기, 무릎 간격을 실시간으로 재고 음성으로 안내한다. 세트를 저장하고 AI 설명을 받는 흐름까지 들어 있다. `measure`, `update`, `findings` 함수를 가져다 쓰면 된다 |
| `form-check.html` | 영상 파일에서 장면을 뽑아 `POST /api/form-checks` 로 보낸다. `extractFrames` 함수를 가져다 쓰면 된다 |

## 알아둘 제약

- 카메라는 HTTPS 또는 localhost에서만 켜진다. 휴대폰으로 시험하려면 HTTPS 주소가 필요하다
- 아이폰은 사용자가 화면을 한 번 눌러야 음성이 나온다. 시작 버튼에서 첫 음성을 낸다
- 촬영은 정면이나 측면으로, 전신이 보이게, 휴대폰은 고정해서 한다
- 근전도는 센서가 없어 시뮬레이션 값이다. 화면에 시뮬레이션이라고 표시한다
- 무릎 모임과 좌우 쏠림은 검증되지 않았다. 참고용 관찰로만 보여 준다
