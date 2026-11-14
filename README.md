# Frontend

카메라로 운동 자세를 추적하고 결과를 보여 주는 웹앱. 백엔드 저장소는 [hackathon-1114/backend](https://github.com/hackathon-1114/backend).

## 백엔드와 연결

- API 문서는 백엔드 서버의 `/swagger-ui.html` 에서 본다
- 응답은 항상 `{ "success", "code", "message", "data" }` 모양이다
- 로그인은 없다. 유저 구분은 `X-User-Id` 헤더로 한다 (없으면 1)
- CORS는 전체 허용이다

## 가져다 쓸 코드

백엔드 저장소의 `src/main/resources/static/` 에 동작하는 예제가 있다.

| 파일 | 내용 |
|---|---|
| `pose-test.html` | MediaPipe로 관절을 추적해 스쿼트 횟수, 깊이, 상체 기울기, 무릎 간격을 실시간으로 재고 음성으로 안내한다. `measure`, `update`, `findings` 함수를 가져다 쓰면 된다 |
| `form-check.html` | 영상 파일에서 장면을 뽑아 `POST /api/form-checks` 로 보낸다. `extractFrames` 함수를 가져다 쓰면 된다 |

## 알아둘 제약

- 카메라는 HTTPS 또는 localhost에서만 켜진다. 휴대폰으로 시험하려면 HTTPS 주소가 필요하다
- 아이폰은 사용자가 화면을 한 번 눌러야 음성이 나온다. 시작 버튼에서 첫 음성을 낸다
- 촬영은 정면이나 측면으로, 전신이 보이게, 휴대폰은 고정해서 한다
