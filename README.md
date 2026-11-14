# Frontend

MUSCLE MAP의 화면. 카메라로 스쿼트를 추적하고, 반복이 쌓일 때 깊이와 속도가 어떻게 달라지는지 보여 준다. 백엔드 저장소는 [hackathon-1114/backend](https://github.com/hackathon-1114/backend).

## 먼저 읽을 것

- [기능별 구현과 한계](https://github.com/hackathon-1114/backend/blob/master/docs/features.md): 화면마다 어떤 API를 부르는지, 각 기능이 어디까지 믿을 만한지
- [자세 감지 검증 기록](https://github.com/hackathon-1114/backend/blob/master/docs/verification.md): 무엇이 확인됐고 무엇이 확인되지 않았는지

## 화면과 API

| 화면 | API |
|---|---|
| 내 몸 (인바디) | `POST /api/inbody` (가상 데이터, 수치, 사진), `GET /api/inbody` |
| 내 몸 (습관 문진) | `POST /api/surveys`, `GET /api/surveys/latest` |
| 내 몸 (확인할 영역) | `POST /api/body-alerts/analyze`, `GET /api/body-alerts/latest` |
| 측정 | 없음. 브라우저 안에서 MediaPipe로 처리 |
| 결과 | `POST /api/sets` (통계가 바로 옴), `POST /api/sets/{id}/feedback` (AI 설명, 3~13초) |
| 홈 (찾은 패턴) | `POST /api/insights/analyze` (약 12초), `GET /api/insights` |

- 정확한 요청과 응답 모양은 백엔드 서버의 `/swagger-ui.html` 에서 본다
- 응답은 항상 `{ "success", "code", "message", "data" }` 모양이다
- 로그인은 없다. 유저 구분은 `X-User-Id` 헤더로 한다 (없으면 1). 유저 1에는 시연용 데이터가 들어 있다
- CORS는 전체 허용이다
- AI가 들어가는 호출은 몇 초씩 걸린다. 통계를 먼저 보여 주고 AI 설명은 나중에 채운다

## 화면

| 파일 | 화면 |
|---|---|
| `index.html` | 홈(반복 깊이 그래프와 찾은 패턴), 내 몸(인바디, 습관, 확인할 영역), 결과 |
| `pose-test.html` | 측정. MediaPipe로 관절을 추적해 횟수와 깊이를 재고 음성으로 안내한다 |
| `app.css` | 공통 스타일. 색은 역도 원판의 색 구분에서 가져왔다 |
| `app.js` | API 호출과 반복 깊이 그래프(`MM.repChart`) |

빌드 도구 없이 정적 파일만으로 동작한다. 배포 서버는 백엔드가 이 파일들을 그대로 띄운다 (백엔드 저장소의 `src/main/resources/static`에 같은 파일이 있다).

## 실행

배포 주소 https://hackathon-backend-production-967eabf5.up.railway.app 를 열면 된다.

로컬에서 화면만 따로 띄우려면 아무 정적 서버로 이 폴더를 열고, `index.html`과 `pose-test.html`의 `app.js`를 불러오는 줄 앞에 백엔드 주소를 적는다.

```html
<script>window.MM_API_BASE = 'https://hackathon-backend-production-967eabf5.up.railway.app';</script>
```

```bash
python3 -m http.server 5173    # http://localhost:5173
```

카메라는 HTTPS나 localhost에서만 켜진다.

## 알아둘 제약

- 카메라는 HTTPS 또는 localhost에서만 켜진다. 휴대폰으로 시험하려면 HTTPS 주소가 필요하다
- 아이폰은 사용자가 화면을 한 번 눌러야 음성이 나온다. 시작 버튼에서 첫 음성을 낸다
- 촬영은 정면이나 측면으로, 전신이 보이게, 휴대폰은 고정해서 한다
- 근전도는 센서가 없어 시뮬레이션 값이다. 화면에 시뮬레이션이라고 표시한다
- 무릎 모임과 좌우 쏠림은 검증되지 않았다. 참고용 관찰로만 보여 준다
