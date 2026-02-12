// 기존 createFloatingBubble 관련 코드는 모두 삭제하셔도 됩니다.
document.addEventListener('DOMContentLoaded', () => {
  console.log("Floating bubbles initialized via CSS.");

  // 클로즈 버튼 클릭 이벤트
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', function () {
      // window.close()는 새 창으로 열린 경우에만 작동
      // 직접 탭을 열었을 경우를 대비해 history.back()도 시도
      if (window.opener) {
        window.close();
      } else {
        // 이전 페이지가 있으면 뒤로 가기, 없으면 홈으로
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      }
    });
  }
});

function animatePieCount(element, targetPercentage, duration = 1500) {
  const valueSpan = element.querySelector('.percentage-value');
  const startTime = performance.now();

  const fill_color = '#2563EB';
  const empty_color = 'rgba(122, 122, 122, 1)';

  function updatePieCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentValue = Math.floor(targetPercentage * progress);

    element.style.background = `
            conic-gradient(
                ${fill_color} ${currentValue}%,
                ${empty_color} 0
            )
        `;
    valueSpan.textContent = `${currentValue}%`;

    if (progress < 1) {
      requestAnimationFrame(updatePieCount);
    }
  }

  requestAnimationFrame(updatePieCount);
}
// --- Chart Animation Logic ---

document.addEventListener('DOMContentLoaded', () => {



  const pieCharts = document.querySelectorAll('.pie-chart-placeholder');
  if (!pieCharts.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const chart = entry.target;
      if (chart.classList.contains('animated')) return;

      const target = Number(chart.dataset.target);
      if (isNaN(target)) return;

      animatePieCount(chart, target);
      chart.classList.add('animated');
      obs.unobserve(chart);
    });
  }, {
    // 🔥 화면 중앙을 기준으로 트리거
    rootMargin: '-45% 0px -35% 0px',
    threshold: 0.15
  });

  pieCharts.forEach(chart => observer.observe(chart));
});


const pieCharts = document.querySelectorAll('.pie-chart-placeholder');

const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const chart = entry.target;

    // 이미 실행됐으면 스킵
    if (chart.classList.contains('animated')) return;

    const target = Number(chart.dataset.target);

    animatePieCount(chart, target);

    chart.classList.add('animated');
    obs.unobserve(chart); // 재실행 방지
  });
}, {
  threshold: 0.6 // 차트가 60% 이상 보이면 시작
});

// 관찰 시작
pieCharts.forEach(chart => observer.observe(chart));





// ... (다른 모든 코드는 이전 단계와 동일하게 유지) ...

// 2. 차트 애니메이션 실행 함수
function runChartAnimations(target) {
  // a. Circle Chart (837만명 원형이 이동하며 커지기)
  const lgCircle = target.querySelector('.circle.lg');
  lgCircle.classList.add('animate-move'); // CSS transform: translateX(0) scale(1) 실행

  // b. Pie Chart 실행 (숫자 카운트와 파이 채우기 동시 실행)
  const pieChart = target.querySelector('.pie-chart-placeholder');
  const pieTarget = parseInt(pieChart.dataset.target);
  animatePieCount(pieChart, pieTarget);
}


// Intersection Observer 설정 (스크롤 시 애니메이션 실행)
document.addEventListener('DOMContentLoaded', () => {
  const marketSection = document.querySelector('.market-section');
  if (!marketSection) return;

  let executed = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !executed) {
        const chartContainer = marketSection.querySelector('.chart-container');
        runChartAnimations(chartContainer);
        executed = true;
        observer.unobserve(marketSection);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(marketSection);
});


const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target); // 한 번만 실행
  });
}, {
  threshold: 0.3
});

revealElements.forEach(el => revealObserver.observe(el));


document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     TEXT REVEAL
  ========================= */
  const revealElements = document.querySelectorAll(
    '.problems-section h2, .problems-section .en-sub-text, .card.black-card h4, .card.black-card li'
  );

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-active');
        observer.unobserve(entry.target); // 1회만 실행
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));


  /* =========================
     CARD STICKY OFFSET
  ========================= */

});


document.addEventListener('DOMContentLoaded', () => {
  const ecosystemSection = document.querySelector('.ecosystem-section');

  // Intersection Observer 설정
  const observerOptions = {
    // rootMargin의 세 번째 값(-30%)은 화면 바닥에서 30% 올라온 지점(즉, 중간 근처)에 
    // 도달했을 때 이벤트를 발생시키라는 뜻입니다.
    rootMargin: '0px 0px -30% 0px',
    threshold: 0.1
  };

  const ecosystemObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 섹션에 active 클래스 추가
        entry.target.classList.add('active');
        // 한 번 실행 후 감시 종료
        ecosystemObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  if (ecosystemSection) {
    ecosystemObserver.observe(ecosystemSection);
  }
});


document.addEventListener('DOMContentLoaded', () => {
  // Main Bottom 섹션 선택
  const mainBottomSection = document.querySelector('.main-bottom');

  const observerOptions = {
    // 섹션이 화면의 20% 지점까지 올라왔을 때 감지
    rootMargin: '0px 0px -20% 0px',
    threshold: 0
  };

  const mainBottomObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // active 클래스 추가로 도트 패턴 및 텍스트 애니메이션 시작
        entry.target.classList.add('active');
        mainBottomObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  if (mainBottomSection) {
    mainBottomObserver.observe(mainBottomSection);
  }
});


document.addEventListener('DOMContentLoaded', () => {
  // 1. 클릭 아코디언 기능
  const triggers = document.querySelectorAll('.gray-box');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.closest('.flow-item-group');
      parent.classList.toggle('active');
    });
  });

  // 2. 스크롤 시 섹션 활성화 (Intersection Observer)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.2 });

  const section = document.querySelector('.solutions-section');
  if (section) observer.observe(section);
});


document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.card.black-card');

  const handleScroll = () => {
    const triggerPoint = window.innerHeight * 0.4; // 40% of viewport height

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();

      // Reset classes first
      card.classList.remove('is-active', 'is-covered');

      // Logic: 
      // If card is sticky (reached its top position), it's potentially active.
      // But we want to know which one is currently the "Main" one being viewed.
      // Usually the last one that crossed the trigger point is the active one.

      // Let's rely on the visual stack logic.
      // If a card is sticking at the top, and another card is BELOW it but also sticking, the one below covers the one above.

      // Simple logic:
      // Loop through and see which cards have reached the sticky zone.

      // Check if the NEXT card has reached the sticky overlap zone.
      // If the next card is overlapping this card, this card becomes 'is-covered'.

      const nextCard = cards[index + 1];
      let isNextCardOverlapping = false;

      if (nextCard) {
        const nextRect = nextCard.getBoundingClientRect();
        // If next card is close to the top (sticky position), it is covering the current card
        if (nextRect.top < window.innerHeight * 0.5) {
          isNextCardOverlapping = true;
        }
      }

      // Apply classes based on scroll position
      // We define "Active" as the card currently fully visible on top of the stack

      if (isNextCardOverlapping) {
        card.classList.add('is-covered');
      } else if (rect.top <= window.innerHeight * 0.8) {
        card.classList.add('is-active');
      }

      // Text Reveal Logic (Optional: trigger when card enters view)
      if (rect.top <= window.innerHeight * 0.75) {
        const texts = card.querySelectorAll('h4, li');
        texts.forEach(el => el.classList.add('reveal-active'));
      }
    });
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Initial check
});





$(document).ready(function () {
  // 1. 스크롤 애니메이션 Observer 설정
  const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        $(entry.target).addClass('active');
        // 한 번 나타나면 감시 해제 (성능 최적화)
        observer.unobserve(entry.target);
      }
    });
  };

  const revealObserver = new IntersectionObserver(revealCallback, {
    threshold: 0.1, // 10% 정도 보이면 시작
    rootMargin: "0px 0px -50px 0px" // 하단 여백을 주어 약간 미리 시작
  });

  // 모든 reveal 요소 감시 시작
  $('.reveal').each(function () {
    revealObserver.observe(this);
  });

  // 2. (기존 로직 유지) 카드 뒤집기 등 추가 기능이 있다면 아래에 계속 작성...
  $('.book-card').on('click', function () {
    $(this).toggleClass('is-flipped');
  });
});

// 벤다이어그램
document.addEventListener('DOMContentLoaded', () => {
  const ecosystemSection = document.querySelector('.ecosystem-section');

  const observerOptions = {
    rootMargin: '0px 0px -30% 0px',
    threshold: 0.1
  };

  const ecosystemObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        ecosystemObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  if (ecosystemSection) {
    ecosystemObserver.observe(ecosystemSection);
  }
});


// 타이핑효과
document.addEventListener('DOMContentLoaded', () => {
  const trigger = document.querySelector('.typing-trigger');
  const typingEl = document.querySelector('.typing-text');
  if (!trigger || !typingEl) return;

  const text = typingEl.dataset.text;
  let index = 0;
  let started = false;

  function startTyping() {
    if (started) return;
    started = true;

    function type() {
      if (index < text.length) {
        typingEl.textContent += text[index];
        index++;
        setTimeout(type, 70);
      } else {
        typingEl.classList.add('is-complete');
        lightUpWord(); // ✅ 타이핑 끝나면 실행
      }
    }

    type();
  }

  // ✅ '밝게'만 불 켜기
  function lightUpWord() {
    const targetWord = '밝게';

    const html = typingEl.textContent.replace(
      targetWord,
      `<span class="light-word">${targetWord}</span>`
    );

    typingEl.innerHTML = html;

    // 살짝 딜레이 후 점등
    setTimeout(() => {
      const wordEl = typingEl.querySelector('.light-word');
      wordEl?.classList.add('is-lit');
    }, 400);
  }

  const observer = new IntersectionObserver(
    ([entry], obs) => {
      if (entry.isIntersecting) {
        startTyping();
        obs.disconnect();
      }
    },
    {
      threshold: 0,
      rootMargin: '0px 0px -20% 0px'
    }
  );

  observer.observe(trigger);
});


// =============================================================
// 문의하기 모달 관련 로직
// =============================================================

// Supabase 클라이언트 초기화
// 도메인 기반 환경 감지
const SUPABASE_CONFIG = {
  // Production 환경 (lyt-app.io 도메인)
  prod: {
    url: 'https://ywaldpxprcusqmfdnlfk.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3YWxkcHhwcmN1c3FtZmRubGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MTQ1NDIsImV4cCI6MjA4MTM5MDU0Mn0.mGrw1aI-Uc1CZT__AEDuQLX1LqBvTc4GJHF58r74MYY'
  },
  // Development 환경 (localhost, preview 등)
  dev: {
    url: 'https://xianrhwkdarupnvaumti.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYW5yaHdrZGFydXBudmF1bXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDM1MzEsImV4cCI6MjA3NjgxOTUzMX0.0elH2T_0kz5FVQnGEfOEfp6HFbwGvYoZZsAlns4PNyo'
  }
};

// 도메인으로 환경 판별
function getSupabaseEnv() {
  const hostname = window.location.hostname;
  // lyt-app.io 도메인이면 prod
  if (hostname === 'lyt-app.io' || hostname === 'www.lyt-app.io') {
    return 'prod';
  }
  // 그 외는 dev (localhost, vercel preview 등)
  return 'dev';
}

const currentEnv = getSupabaseEnv();
const SUPABASE_URL = SUPABASE_CONFIG[currentEnv].url;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG[currentEnv].anonKey;

let supabaseClient = null;

// Supabase SDK 로드 후 클라이언트 초기화
function initSupabase() {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

// DOM 로드 시 Supabase 초기화
document.addEventListener('DOMContentLoaded', () => {
  // Supabase SDK가 로드될 때까지 대기
  const checkSupabase = setInterval(() => {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
      initSupabase();
      clearInterval(checkSupabase);
    }
  }, 100);

  // 문자 수 카운트 이벤트
  const contentsTextarea = document.getElementById('inquiryContents');
  const contentsLengthSpan = document.getElementById('contentsLength');

  if (contentsTextarea && contentsLengthSpan) {
    contentsTextarea.addEventListener('input', function () {
      contentsLengthSpan.textContent = this.value.length;
    });
  }

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeInquiryModal();
      closePurchaseModal();
    }
  });
});

// 모달 열기
function openInquiryModal() {
  const overlay = document.getElementById('inquiryModalOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    // 리플로우 후 애니메이션 적용
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
    document.body.style.overflow = 'hidden';
  }
}

// 모달 닫기
function closeInquiryModal() {
  const overlay = document.getElementById('inquiryModalOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      resetInquiryForm();
    }, 300);
  }
}

// 오버레이 클릭 시 모달 닫기
function closeInquiryModalOnOverlay(event) {
  if (event.target.id === 'inquiryModalOverlay') {
    closeInquiryModal();
  }
}

// 폼 리셋
function resetInquiryForm() {
  const form = document.getElementById('inquiryForm');
  if (form) {
    form.reset();
  }

  // 글자 수 리셋
  const contentsLengthSpan = document.getElementById('contentsLength');
  if (contentsLengthSpan) {
    contentsLengthSpan.textContent = '0';
  }

  // 파일명 리셋
  const fileNameSpan = document.getElementById('inquiryFileName');
  if (fileNameSpan) {
    fileNameSpan.textContent = '';
  }

  // 에러/성공 메시지 숨기기
  hideInquiryError();
  hideInquirySuccess();
}

// 파일 선택 핸들러
function handleFileSelect(event) {
  const file = event.target.files[0];
  const fileNameSpan = document.getElementById('inquiryFileName');

  if (file && fileNameSpan) {
    fileNameSpan.textContent = file.name;
  } else if (fileNameSpan) {
    fileNameSpan.textContent = '';
  }
}

// 에러 메시지 표시
function showInquiryError(message) {
  const errorDiv = document.getElementById('inquiryError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// 에러 메시지 숨기기
function hideInquiryError() {
  const errorDiv = document.getElementById('inquiryError');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// 성공 메시지 표시
function showInquirySuccess(message) {
  const successDiv = document.getElementById('inquirySuccess');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
  }
}

// 성공 메시지 숨기기
function hideInquirySuccess() {
  const successDiv = document.getElementById('inquirySuccess');
  if (successDiv) {
    successDiv.style.display = 'none';
  }
}

// 로딩 상태 설정
function setInquiryLoading(isLoading) {
  const submitBtn = document.getElementById('inquirySubmitBtn');
  const submitText = document.getElementById('inquirySubmitText');
  const submitLoading = document.getElementById('inquirySubmitLoading');

  if (submitBtn) {
    submitBtn.disabled = isLoading;
  }
  if (submitText) {
    submitText.style.display = isLoading ? 'none' : 'inline';
  }
  if (submitLoading) {
    submitLoading.style.display = isLoading ? 'inline-flex' : 'none';
  }
}

// 이메일 유효성 검사
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 파일 업로드
async function uploadInquiryFile(file) {
  if (!supabaseClient || !file) return null;

  try {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

    const { error } = await supabaseClient.storage
      .from('inquiry-files')
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabaseClient.storage
      .from('inquiry-files')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return null;
  }
}

// 문의 제출
async function submitInquiry(event) {
  event.preventDefault();

  // 입력값 가져오기
  const contents = document.getElementById('inquiryContents').value.trim();
  const email = document.getElementById('inquiryEmail').value.trim();
  const privacyAgree = document.getElementById('inquiryPrivacyAgree').checked;
  const fileInput = document.getElementById('inquiryFile');
  const file = fileInput.files[0];

  // 에러 메시지 초기화
  hideInquiryError();
  hideInquirySuccess();

  // 유효성 검사
  if (!contents) {
    showInquiryError('문의 내용을 입력해 주세요.');
    return;
  }

  if (!email) {
    showInquiryError('연락받을 이메일을 입력해 주세요.');
    return;
  }

  if (!isValidEmail(email)) {
    showInquiryError('올바른 이메일 형식이 아닙니다.');
    return;
  }

  if (!privacyAgree) {
    showInquiryError('개인정보 수집 및 이용에 동의해 주세요.');
    return;
  }

  // Supabase 클라이언트 확인
  if (!supabaseClient) {
    showInquiryError('서비스 연결에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  // 로딩 시작
  setInquiryLoading(true);

  try {
    // 파일 업로드 (있는 경우)
    let attachments = null;
    if (file) {
      const fileUrl = await uploadInquiryFile(file);
      if (fileUrl) {
        attachments = [fileUrl];
      }
    }

    // 문의 데이터 저장
    const { error } = await supabaseClient.from('inquiries').insert({
      user_id: null,
      username: '랜딩페이지 문의',
      nickname: null,
      inquiry_type: 'general',
      subject: '랜딩페이지 문의',
      contents: contents,
      email: email,
      attachments: attachments,
      status: 'pending',
    });

    if (error) {
      throw error;
    }

    // 성공 처리
    showInquirySuccess('문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.');

    // 폼 초기화 (성공 메시지는 유지)
    document.getElementById('inquiryContents').value = '';
    document.getElementById('inquiryEmail').value = '';
    document.getElementById('inquiryPrivacyAgree').checked = false;
    document.getElementById('inquiryFile').value = '';
    document.getElementById('inquiryFileName').textContent = '';
    document.getElementById('contentsLength').textContent = '0';

    // 3초 후 모달 닫기
    setTimeout(() => {
      closeInquiryModal();
    }, 3000);

  } catch (error) {
    console.error('문의 제출 실패:', error);
    showInquiryError('문의 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    setInquiryLoading(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const svcPage = document.querySelector('body.svc-page');
  if (!svcPage) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;
  let rafId = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const applyPosition = () => {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;

    svcPage.style.setProperty('--svc-mx', `${currentX.toFixed(2)}px`);
    svcPage.style.setProperty('--svc-my', `${currentY.toFixed(2)}px`);

    if (Math.abs(targetX - currentX) > 0.08 || Math.abs(targetY - currentY) > 0.08) {
      rafId = requestAnimationFrame(applyPosition);
    } else {
      rafId = null;
    }
  };

  const scheduleUpdate = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(applyPosition);
    }
  };

  const updateFromPointer = (clientX, clientY) => {
    const normalizedX = (clientX / window.innerWidth) * 2 - 1;
    const normalizedY = (clientY / window.innerHeight) * 2 - 1;
    targetX = clamp(normalizedX * 20, -20, 20);
    targetY = clamp(normalizedY * 16, -16, 16);
    scheduleUpdate();
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    updateFromPointer(event.clientX, event.clientY);
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    targetX = 0;
    targetY = 0;
    scheduleUpdate();
  });
});


// =============================================================
// 구매 모달 관련 로직 (문의하기 모달과 동일 패턴)
// =============================================================

let selectedProduct = null;

// 모달 열기
function openPurchaseModal(productId, productName, productPrice) {
  selectedProduct = { id: productId, name: productName, price: productPrice };

  const nameEl = document.getElementById('selectedProductName');
  const priceEl = document.getElementById('selectedProductPrice');
  if (nameEl) nameEl.textContent = productName;
  if (priceEl) priceEl.textContent = productPrice.toLocaleString();

  const overlay = document.getElementById('purchaseModalOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
    document.body.style.overflow = 'hidden';
  }
}

// 모달 닫기
function closePurchaseModal() {
  const overlay = document.getElementById('purchaseModalOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  }
  resetPurchaseForm();
  selectedProduct = null;
}

// 오버레이 클릭 시 모달 닫기
function closePurchaseModalOnOverlay(event) {
  if (event.target.id === 'purchaseModalOverlay') {
    closePurchaseModal();
  }
}

// 폼 리셋
function resetPurchaseForm() {
  const form = document.getElementById('purchaseForm');
  if (form) form.reset();

  const errorDiv = document.getElementById('purchaseError');
  if (errorDiv) errorDiv.style.display = 'none';
}

// 에러 메시지 표시
function showPurchaseError(message) {
  const errorDiv = document.getElementById('purchaseError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// 구매 폼 제출
function submitPurchase(event) {
  event.preventDefault();

  const guestName = document.getElementById('guestName').value.trim();
  const guestEmail = document.getElementById('guestEmail').value.trim();
  const privacyAgree = document.getElementById('purchasePrivacyAgree').checked;

  if (!guestName) {
    showPurchaseError('이름을 입력해 주세요.');
    return;
  }

  if (!guestEmail) {
    showPurchaseError('이메일을 입력해 주세요.');
    return;
  }

  if (!isValidEmail(guestEmail)) {
    showPurchaseError('올바른 이메일 형식이 아닙니다.');
    return;
  }

  if (!privacyAgree) {
    showPurchaseError('개인정보 수집 및 이용에 동의해 주세요.');
    return;
  }

  if (!selectedProduct) {
    showPurchaseError('상품 정보를 찾을 수 없습니다. 페이지를 새로고침해 주세요.');
    return;
  }

  // webapp CheckoutPage로 이동 (환경별 URL)
  const hostname = window.location.hostname;
  let appBaseUrl;
  if (hostname === 'lyt-app.io' || hostname === 'www.lyt-app.io') {
    appBaseUrl = 'https://app.lyt-app.io';
  } else if (hostname.includes('vercel.app')) {
    appBaseUrl = 'https://bridge-app-git-staging-culgamyuns-projects.vercel.app';
  } else {
    appBaseUrl = 'http://localhost:5173';
  }
  const checkoutUrl = new URL(appBaseUrl + '/checkout');
  checkoutUrl.searchParams.set('orderName', selectedProduct.name);
  checkoutUrl.searchParams.set('orderType', 'digital_product');
  checkoutUrl.searchParams.set('amount', selectedProduct.price);
  checkoutUrl.searchParams.set('relatedId', selectedProduct.id);
  checkoutUrl.searchParams.set('relatedType', 'digital_product');
  checkoutUrl.searchParams.set('guestMode', 'true');
  checkoutUrl.searchParams.set('guestName', guestName);
  checkoutUrl.searchParams.set('guestEmail', guestEmail);
  checkoutUrl.searchParams.set('landingOrigin', window.location.origin);

  window.location.href = checkoutUrl.toString();
}

// =============================================================
// 구매 완료 상품 다운로드 버튼 표시 (localStorage 기반)
// =============================================================
function checkPurchasedProducts() {
  try {
    const purchases = JSON.parse(localStorage.getItem('lyt_purchases') || '{}');
    if (Object.keys(purchases).length === 0) return;

    // 모든 구매하기 버튼을 찾아서 구매 완료된 상품은 다운로드 버튼으로 변경
    const buttons = document.querySelectorAll('.svc-plan-button');
    buttons.forEach(function (btn) {
      const onclickAttr = btn.getAttribute('onclick');
      if (!onclickAttr) return;

      // openPurchaseModal('productId', ...) 에서 productId 추출
      const match = onclickAttr.match(/openPurchaseModal\('([^']+)'/);
      if (!match) return;

      const productId = match[1];
      const purchase = purchases[productId];
      if (!purchase || !purchase.downloadToken) return;

      // 환경별 Supabase URL
      const hostname = window.location.hostname;
      const supabaseUrl = (hostname === 'lyt-app.io' || hostname === 'www.lyt-app.io')
        ? 'https://ywaldpxprcusqmfdnlfk.supabase.co'
        : 'https://xianrhwkdarupnvaumti.supabase.co';

      const downloadUrl = supabaseUrl + '/functions/v1/download-digital-product?token=' + purchase.downloadToken;

      // 버튼을 다운로드 링크로 교체
      var link = document.createElement('a');
      link.href = downloadUrl;
      link.className = btn.className;
      link.textContent = '다운로드';
      link.style.backgroundColor = '#10B981';
      link.style.display = 'inline-block';
      link.style.textAlign = 'center';
      link.style.textDecoration = 'none';
      link.style.color = '#fff';
      btn.parentNode.replaceChild(link, btn);
    });
  } catch (e) {
    console.warn('Failed to check purchased products:', e);
  }
}

// 페이지 로드 시 구매 상품 확인
document.addEventListener('DOMContentLoaded', checkPurchasedProducts);
