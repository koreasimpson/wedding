/**
 * 뉴스 크롤링 Edge Function 테스트 스크립트
 *
 * 실행 방법:
 * 1. 로컬에서 Edge Function 시작:
 *    supabase functions serve crawl-news
 *
 * 2. 이 스크립트 실행:
 *    deno run --allow-net test.ts
 */

const FUNCTION_URL = 'http://localhost:54321/functions/v1/crawl-news';
const ANON_KEY = 'your-anon-key'; // .env에서 가져온 NEXT_PUBLIC_SUPABASE_ANON_KEY

async function testCrawlNews() {
  console.log('🚀 Testing crawl-news function...\n');

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS');
      console.log(`   Total Properties: ${data.total_properties}`);
      console.log(`   Crawled: ${data.crawled}`);
      console.log(`   Failed: ${data.failed}`);

      if (data.errors && data.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        data.errors.forEach((error: string) => {
          console.log(`   - ${error}`);
        });
      }
    } else {
      console.log('\n❌ ERROR');
      console.log(`   ${data.error}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 실행
testCrawlNews();
