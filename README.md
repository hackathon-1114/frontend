# MOTIF 화면

카메라로 스쿼트를 따라가며, 반복이 쌓일 때 앉는 깊이와 속도가 어떻게 달라지는지 보여 주는 웹앱의 화면입니다. 서버와 전체 설명은 [hackathon-1114/backend](https://github.com/hackathon-1114/backend)에 있습니다.

써 보기 https://hackathon-backend-production-967eabf5.up.railway.app

## 화면

| 단계 | 화면 | 파일 | 부르는 API |
|---|---|---|---|
| 0 | 스플래시 | `index.html`, `assets/splash` | 없음 |
| 1 | 인바디 | `index.html` | `POST /api/inbody` |
| 2 | 문진 | `index.html` | `POST /api/surveys` |
| 3 | 확인 영역 | `index.html` | `POST /api/body-alerts/analyze` |
| 4 | 카메라 | `pose-test.html` | `POST /api/sets`, `POST /api/sets/{id}/feedback` |
| 5 | 결과 | `index.html` | `GET /api/overview`, `POST /api/insights/analyze` |

## 만든 방식

- 빌드 도구 없이 HTML, CSS, JS 파일만으로 동작합니다. 배포 서버는 같은 파일을 백엔드가 그대로 내려 줍니다.
- 4단계는 MediaPipe Pose Landmarker로 브라우저 안에서 관절을 추적합니다. 영상은 서버로 보내지 않습니다. `pose-test.html`의 `measure`, `update`, `findings`가 횟수와 자세를 재는 부분입니다.
- 반복 깊이 그래프는 `app.js`의 `MM.repChart`가 SVG로 그립니다. 반복이 몇 회든 같은 폭에 들어가고, 달라지기 시작한 회차부터 색이 바뀝니다.
- 디자인은 Figma의 디자인 시스템(어두운 바탕, 라임 강조색)을 따릅니다.
- 화면을 다른 주소에서 띄울 때는 `window.MM_API_BASE`에 서버 주소를 넣습니다. 서버의 CORS는 전체 허용입니다.

## 실행

정적 파일이라 아무 웹 서버로나 띄우면 됩니다.

```bash
python3 -m http.server 5173
```

카메라는 HTTPS나 localhost에서만 열립니다.
