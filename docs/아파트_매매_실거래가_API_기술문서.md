# 국토교통부 실거래가 정보 오픈API 활용 가이드
## 아파트 매매 실거래가 상세 자료

---

## 목차

- [Ⅰ. 서비스 명세](#ⅰ-서비스-명세)
  - [가. API 서비스 개요](#가-api-서비스-개요)
  - [나. 상세기능 목록](#나-상세기능-목록)
  - [다. 상세기능내역](#다-상세기능내역)
- [Ⅱ. OpenAPI 에러 코드 정리](#ⅱ-openapi-에러-코드-정리)

---

## Ⅰ. 서비스 명세

### 공공데이터 OpenAPI 조회 서비스

### 가. API 서비스 개요

#### API 서비스 정보

| 항목 | 내용 |
|------|------|
| **API명 (영문)** | Detailed data on actual apartment sales prices |
| **API명 (국문)** | 아파트 매매 실거래가 상세 자료 |
| **API 설명** | 지역코드와 기간을 설정하여 해당지역, 해당기간의 아파트 매매 상세 자료를 제공하는 아파트 매매 실거래가 상세 자료 조회 |

#### API 서비스 보안적용 기술 수준

**서비스 인증/권한**
- ✅ Service Key
- ⬜ 인증서 (GPKI/NPKI)
- ⬜ BASIC (IP/PW)
- ⬜ 없음

**메시지 레벨 암호화**
- ⬜ 전자서명
- ⬜ 암호화
- ✅ 없음

**전송 레벨 암호화**
- ⬜ SSL
- ✅ 없음

**인터페이스 표준**
- ⬜ SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped)
- ✅ REST (GET)
- ⬜ RSS 1.0
- ⬜ RSS 2.0
- ⬜ ATOM 1.0
- ⬜ 기타

**교환 데이터 표준** (중복선택 가능)
- ✅ XML
- ⬜ JSON
- ⬜ MIME
- ⬜ MTOM

#### API 서비스 배포 정보

| 항목 | 내용 |
|------|------|
| **서비스 URL** | `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev` |
| **서비스 명세 URL** | `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?_wadl&type=xml` |
| **서비스 버전** | 1.0 |
| **서비스 시작일** | 2020년 |

---

### 나. 상세기능 목록

| 기능명 | 기능 설명 | 오퍼레이션명 |
|--------|-----------|--------------|
| 아파트 매매 실거래가 상세 조회 | 지역코드와 기간을 설정하여 해당 지역, 해당 기간의 아파트 매매 실거래가 상세 자료 제공 | `getRTMSDataSvcAptTradeDev` |

---

### 다. 상세기능내역

#### a) 상세기능정보

| 항목 | 내용 |
|------|------|
| **기능명** | 아파트 매매 실거래가 상세 조회 |
| **기능 설명** | 지역코드와 기간을 설정하여 해당 지역, 해당 기간의 아파트 매매 실거래가 상세 자료 제공 |
| **오퍼레이션명** | `getRTMSDataSvcAptTradeDev` |
| **요청 메시지 방식** | REST (GET) |
| **응답 메시지 방식** | REST |
| **요청 메시지 타입** | URL Parameter |
| **응답 메시지 타입** | XML |

---

#### b) 요청 메시지 명세

**엔드포인트**
```
GET /getRTMSDataSvcAptTradeDev
```

**요청 파라미터**

| 항목명(영문) | 항목명(한글) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|-------------|-------------|----------|----------|-----------|----------|
| `serviceKey` | 서비스키 | 100 | 1 | (인증키) | 공공데이터포털에서 발급받은 인증키 |
| `LAWD_CD` | 지역코드 | 5 | 1 | 11110 | 각 지역별 코드 (법정동코드 5자리) |
| `DEAL_YMD` | 계약월 | 6 | 1 | 202001 | 실거래 자료의 계약년월 (YYYYMM 형식) |
| `pageNo` | 페이지번호 | - | 0 | 1 | 페이지 번호 (기본값: 1) |
| `numOfRows` | 한 페이지 결과 수 | - | 0 | 10 | 한 페이지 결과 수 (기본값: 10) |

> **※ 항목구분:** 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

**요청 예제**
```
http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey={인증키}&LAWD_CD=11110&DEAL_YMD=202001&pageNo=1&numOfRows=10
```

---

#### c) 응답 메시지 명세

**응답 XML 구조**

```xml
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <거래금액>...</거래금액>
        <건축년도>...</건축년도>
        <년>...</년>
        <법정동>...</법정동>
        <아파트>...</아파트>
        <월>...</월>
        <일>...</일>
        <전용면적>...</전용면적>
        <지번>...</지번>
        <지역코드>...</지역코드>
        <층>...</층>
      </item>
    </items>
    <numOfRows>10</numOfRows>
    <pageNo>1</pageNo>
    <totalCount>100</totalCount>
  </body>
</response>
```

**응답 항목 상세**

| 항목명(영문) | 항목명(한글) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|-------------|-------------|----------|----------|-----------|----------|
| `거래금액` | 거래금액 | 20 | 1 | 82,500 | 거래금액 (단위: 만원) |
| `건축년도` | 건축년도 | 4 | 1 | 2008 | 아파트 건축년도 |
| `년` | 계약년도 | 4 | 1 | 2020 | 계약 체결 년도 |
| `법정동` | 법정동명 | 40 | 1 | 사직동 | 법정동명 |
| `아파트` | 아파트명 | 40 | 1 | 광화문풍림스페이스본(9-0) | 아파트 이름 |
| `월` | 계약월 | 2 | 1 | 1 | 계약 체결 월 |
| `일` | 계약일 | 2 | 1 | 10 | 계약 체결 일 |
| `전용면적` | 전용면적 | 20 | 1 | 94.51 | 전용면적 (단위: ㎡) |
| `지번` | 지번 | 10 | 1 | 9 | 지번 |
| `지역코드` | 지역코드 | 5 | 1 | 11110 | 법정동코드 5자리 |
| `층` | 층 | 4 | 1 | 11 | 거래된 층수 |
| `dealingGbn` | 거래유형 | 20 | 0 | 직거래 | 거래 유형 (직거래/중개거래) |
| `dealerLawdnm` | 중개사소재지 | 200 | 0 | 서울 용산구 | 중개사 소재지 |
| `cdealType` | 해제사유발생일 | 10 | 0 | - | 거래 해제 시 해제 사유 발생일 |
| `cdealDay` | 해제여부 | 1 | 0 | - | 거래 해제 여부 (O: 해제) |

> **※ 항목구분:** 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

---

#### d) 요청/응답 메시지 예제

**요청 예제**
```
GET http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=발급받은인증키&LAWD_CD=11110&DEAL_YMD=202001&pageNo=1&numOfRows=10
```

**응답 예제**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE.</resultMsg>
  </header>
  <body>
    <items>
      <item>
        <거래금액>82,500</거래금액>
        <건축년도>2008</건축년도>
        <년>2020</년>
        <법정동>사직동</법정동>
        <아파트>광화문풍림스페이스본(9-0)</아파트>
        <월>1</월>
        <일>10</일>
        <전용면적>94.51</전용면적>
        <지번>9</지번>
        <지역코드>11110</지역코드>
        <층>11</층>
        <dealingGbn>직거래</dealingGbn>
        <dealerLawdnm>서울 용산구</dealerLawdnm>
      </item>
    </items>
    <numOfRows>10</numOfRows>
    <pageNo>1</pageNo>
    <totalCount>45</totalCount>
  </body>
</response>
```

---

## Ⅱ. OpenAPI 에러 코드 정리

### OpenAPI 에러 코드별 조치방안

| 에러코드 | 에러메시지 | 상세 설명 | 조치방안 |
|---------|-----------|----------|----------|
| **00** | NORMAL SERVICE | 정상 처리 | - |
| **01** | APPLICATION ERROR | 어플리케이션 에러 | 해당 오픈API 제공기관으로 문의 |
| **02** | DB ERROR | 데이터베이스 에러 | 해당 오픈API 제공기관으로 문의 |
| **03** | NODATA ERROR | 데이터없음 에러 | 요청 파라미터 확인 후 재시도 |
| **04** | HTTP ERROR | HTTP 에러 | 서버 상태 확인 후 재시도 |
| **05** | SERVICETIMEOUT ERROR | 서비스 연결실패 에러 | 해당 오픈API 제공기관으로 문의 |
| **10** | INVALID REQUEST PARAMETER ERROR | 잘못된 요청 파라미터 에러 | 요청 파라미터 확인 후 재시도 |
| **11** | NO MANDATORY REQUEST PARAMETERS ERROR | 필수요청 파라미터가 없음 | 필수 파라미터 확인 후 재시도 |
| **12** | NO OPENAPI SERVICE ERROR | 해당 오픈API 서비스가 없거나 폐기됨 | 오픈API 목록 확인 |
| **20** | SERVICE ACCESS DENIED ERROR | 서비스 접근거부 | 서비스 요청 제한 횟수 확인 |
| **22** | LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR | 서비스 요청제한 횟수 초과 에러 | 일일 트래픽 제한 확인 |
| **30** | SERVICE KEY IS NOT REGISTERED ERROR | 등록되지 않은 서비스키 | 서비스키 발급 확인 |
| **31** | DEADLINE HAS EXPIRED ERROR | 활용기간 만료 | 활용 신청 기간 연장 |
| **32** | UNREGISTERED IP ERROR | 등록되지 않은 IP | 서비스 키 상세 정보에서 서버 IP 등록 |
| **33** | UNSIGNED CALL ERROR | 서명되지 않은 호출 | 일반 인증키가 아닌 서명 인증키 확인 필요 |
| **99** | UNKNOWN ERROR | 기타 에러 | 해당 오픈API 제공기관으로 문의 |

---

### 주요 에러 해결 가이드

#### 1. 인증 관련 에러 (30, 31, 32, 33)

**증상:**
- `SERVICE KEY IS NOT REGISTERED ERROR (30)`
- `UNREGISTERED IP ERROR (32)`

**해결방법:**
1. 공공데이터포털(data.go.kr)에서 서비스키 발급 확인
2. 서비스키가 활성화 상태인지 확인
3. 서버 IP가 등록되어 있는지 확인
4. 서명 인증 방식인 경우 서명값 생성 확인

#### 2. 파라미터 관련 에러 (10, 11)

**증상:**
- `INVALID REQUEST PARAMETER ERROR (10)`
- `NO MANDATORY REQUEST PARAMETERS ERROR (11)`

**해결방법:**
1. 필수 파라미터 누락 확인: `serviceKey`, `LAWD_CD`, `DEAL_YMD`
2. 파라미터 형식 확인:
   - `LAWD_CD`: 5자리 숫자 (예: 11110)
   - `DEAL_YMD`: 6자리 YYYYMM 형식 (예: 202001)
3. URL 인코딩 확인

#### 3. 데이터 없음 에러 (03)

**증상:**
- `NODATA ERROR (03)`

**해결방법:**
1. 요청한 지역코드와 기간에 실제 거래 데이터가 있는지 확인
2. 다른 지역코드나 기간으로 재시도
3. 페이지 번호가 전체 페이지 수를 초과하지 않는지 확인

#### 4. 서비스 제한 에러 (20, 22)

**증상:**
- `LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR (22)`

**해결방법:**
1. 일일 트래픽 제한 확인 (일반적으로 1,000건/일)
2. 다음날까지 대기하거나 추가 트래픽 신청
3. 요청 빈도 조절 (Rate Limiting 구현)

---

### 연락처

**공공데이터포털 고객센터**
- 전화: 1600-6566
- 이메일: https://www.data.go.kr/tcs/css/main.do

**국토교통부 실거래가 공개시스템**
- 웹사이트: http://rt.molit.go.kr

---

## 부록: 법정동코드 예시

### 서울특별시 주요 지역코드

| 지역명 | 법정동코드 |
|--------|-----------|
| 종로구 | 11110 |
| 중구 | 11140 |
| 용산구 | 11170 |
| 성동구 | 11200 |
| 광진구 | 11215 |
| 동대문구 | 11230 |
| 중랑구 | 11260 |
| 성북구 | 11290 |
| 강북구 | 11305 |
| 도봉구 | 11320 |
| 노원구 | 11350 |
| 은평구 | 11380 |
| 서대문구 | 11410 |
| 마포구 | 11440 |
| 양천구 | 11470 |
| 강서구 | 11500 |
| 구로구 | 11530 |
| 금천구 | 11545 |
| 영등포구 | 11560 |
| 동작구 | 11590 |
| 관악구 | 11620 |
| 서초구 | 11650 |
| 강남구 | 11680 |
| 송파구 | 11710 |
| 강동구 | 11740 |

> **참고:** 전체 법정동코드는 행정표준코드관리시스템(https://www.code.go.kr)에서 확인 가능합니다.

---

*본 문서는 국토교통부 실거래가 정보 오픈API 활용을 위한 기술 가이드입니다.*  
*최종 업데이트: 2020년*
