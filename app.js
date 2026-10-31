const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const bookList = document.querySelector("#book-list");
const statusMessage = document.querySelector("#status-message");
const resultCount = document.querySelector("#result-count");
const authForm = document.querySelector("#auth-form");
const emailInput = document.querySelector("#email-input");
const passwordInput = document.querySelector("#password-input");
const signUpButton = document.querySelector("#sign-up-button");
const signInButton = document.querySelector("#sign-in-button");
const signOutButton = document.querySelector("#sign-out-button");
const guestAuthArea = document.querySelector("#guest-auth-area");
const signedInArea = document.querySelector("#signed-in-area");
const userEmail = document.querySelector("#user-email");
const authMessage = document.querySelector("#auth-message");
const purchaseMessage = document.querySelector("#purchase-message");
const myOrdersSection = document.querySelector("#my-orders-section");
const ordersStatusMessage = document.querySelector("#orders-status-message");
const ordersList = document.querySelector("#orders-list");

let currentSession = null;
let ordersRequestVersion = 0;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
  statusMessage.classList.toggle("is-error", isError);
}

function formatPrice(price) {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.hidden = !message;
  authMessage.classList.toggle("is-error", isError);
}

function setAuthRequestButtonsDisabled(disabled) {
  signUpButton.disabled = disabled;
  signInButton.disabled = disabled;
}

function setPurchaseMessage(message, isError = false) {
  purchaseMessage.textContent = message;
  purchaseMessage.hidden = !message;
  purchaseMessage.classList.toggle("is-error", isError);
}

function setOrdersStatus(message, isError = false) {
  ordersStatusMessage.textContent = message;
  ordersStatusMessage.hidden = !message;
  ordersStatusMessage.classList.toggle("is-error", isError);
}

function clearOrders() {
  ordersRequestVersion += 1;
  ordersList.replaceChildren();
  setOrdersStatus("");
}

function updateAuthView(session) {
  const isSignedIn = Boolean(session);

  currentSession = session;
  guestAuthArea.hidden = isSignedIn;
  signedInArea.hidden = !isSignedIn;
  userEmail.textContent = isSignedIn ? session.user.email : "";
  myOrdersSection.hidden = !isSignedIn;

  clearOrders();

  if (isSignedIn) {
    void loadOrders(session.user.id);
  }
}

async function restoreSession() {
  try {
    const { data, error } = await sb.auth.getSession();

    if (error) {
      setAuthMessage(`로그인 상태를 확인하지 못했습니다: ${error.message}`, true);
      return;
    }

    updateAuthView(data.session);
  } catch (error) {
    setAuthMessage(`로그인 상태를 확인하지 못했습니다: ${error.message}`, true);
  }
}

async function signUp() {
  if (!authForm.reportValidity()) {
    return;
  }

  setAuthRequestButtonsDisabled(true);
  setAuthMessage("회원가입을 처리하는 중입니다.");

  try {
    const { data, error } = await sb.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (error) {
      setAuthMessage(`회원가입하지 못했습니다: ${error.message}`, true);
      return;
    }

    if (data.session) {
      updateAuthView(data.session);
      passwordInput.value = "";
      setAuthMessage("회원가입과 로그인이 완료되었습니다.");
    } else {
      passwordInput.value = "";
      setAuthMessage("회원가입되었습니다. 이메일 확인 후 로그인해 주세요.");
    }
  } catch (error) {
    setAuthMessage(`회원가입하지 못했습니다: ${error.message}`, true);
  } finally {
    setAuthRequestButtonsDisabled(false);
  }
}

async function signIn() {
  if (!authForm.reportValidity()) {
    return;
  }

  setAuthRequestButtonsDisabled(true);
  setAuthMessage("로그인하는 중입니다.");

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (error) {
      setAuthMessage(`로그인하지 못했습니다: ${error.message}`, true);
      return;
    }

    updateAuthView(data.session);
    passwordInput.value = "";
    setAuthMessage("로그인되었습니다.");
  } catch (error) {
    setAuthMessage(`로그인하지 못했습니다: ${error.message}`, true);
  } finally {
    setAuthRequestButtonsDisabled(false);
  }
}

async function signOut() {
  signOutButton.disabled = true;
  clearOrders();
  setAuthMessage("로그아웃하는 중입니다.");

  try {
    const { error } = await sb.auth.signOut();

    if (error) {
      setAuthMessage(`로그아웃하지 못했습니다: ${error.message}`, true);
      return;
    }

    setAuthMessage("로그아웃되었습니다.");
  } catch (error) {
    setAuthMessage(`로그아웃하지 못했습니다: ${error.message}`, true);
  } finally {
    signOutButton.disabled = false;
  }
}

function formatOrderDate(createdAt) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function showOrders(orders) {
  ordersList.replaceChildren();

  for (const order of orders) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const amount = document.createElement("p");
    const details = document.createElement("p");
    const date = document.createElement("p");

    card.className = "order-card";
    amount.className = "book-price";
    details.className = "order-details";
    date.className = "order-date";

    title.textContent = order.book_title;
    amount.textContent = formatPrice(Number(order.unit_price) * Number(order.quantity));
    details.textContent = `수량 ${order.quantity}권 · 단가 ${formatPrice(order.unit_price)}`;
    date.textContent = formatOrderDate(order.created_at);

    card.append(title, amount, details, date);
    ordersList.append(card);
  }
}

async function loadOrders(userId) {
  if (!currentSession || currentSession.user.id !== userId) {
    return;
  }

  const requestVersion = ++ordersRequestVersion;
  setOrdersStatus("주문 목록을 불러오는 중입니다.");
  ordersList.replaceChildren();

  try {
    const { data: orders, error } = await sb
      .from("orders")
      .select("book_title, quantity, unit_price, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (requestVersion !== ordersRequestVersion || currentSession?.user.id !== userId) {
      return;
    }

    if (error) {
      setOrdersStatus(`주문 목록을 불러오지 못했습니다: ${error.message}`, true);
      return;
    }

    if (!orders || orders.length === 0) {
      setOrdersStatus("주문 내역이 없습니다.");
      return;
    }

    setOrdersStatus("");
    showOrders(orders);
  } catch (error) {
    if (requestVersion === ordersRequestVersion && currentSession?.user.id === userId) {
      setOrdersStatus(`주문 목록을 불러오지 못했습니다: ${error.message}`, true);
    }
  }
}

async function purchaseBook(book, quantityInput, purchaseButton) {
  if (!currentSession) {
    setAuthMessage("구매하려면 먼저 로그인해 주세요.", true);
    return;
  }

  const quantity = Number(quantityInput.value);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    setPurchaseMessage("수량은 1부터 10까지의 정수로 입력해 주세요.", true);
    return;
  }

  const expectedAmount = Number(book.price) * quantity;
  const isConfirmed = window.confirm(
    `도서명: ${book.title}\n수량: ${quantity}권\n예상 금액: ${formatPrice(expectedAmount)}\n\n모의 구매하시겠습니까?`
  );

  if (!isConfirmed) {
    return;
  }

  const buyerId = currentSession.user.id;
  purchaseButton.disabled = true;
  setPurchaseMessage("모의 구매를 처리하는 중입니다.");

  try {
    const { error } = await sb.rpc("purchase_book", {
      p_book_id: book.id,
      p_quantity: quantity,
    });

    if (error) {
      setPurchaseMessage(`모의 구매하지 못했습니다: ${error.message}`, true);
      return;
    }

    setPurchaseMessage("모의 구매가 완료되었습니다.");

    if (currentSession?.user.id === buyerId) {
      void loadOrders(buyerId);
    }
  } catch (error) {
    setPurchaseMessage(`모의 구매하지 못했습니다: ${error.message}`, true);
  } finally {
    purchaseButton.disabled = false;
  }
}

function showBooks(books) {
  bookList.replaceChildren();

  for (const book of books) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const author = document.createElement("p");
    const price = document.createElement("p");
    const purchaseControls = document.createElement("div");
    const quantityInput = document.createElement("input");
    const purchaseButton = document.createElement("button");

    card.className = "book-card";
    author.className = "book-author";
    price.className = "book-price";
    purchaseControls.className = "purchase-controls";

    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = "10";
    quantityInput.step = "1";
    quantityInput.value = "1";
    quantityInput.setAttribute("aria-label", `${book.title} 수량`);

    purchaseButton.type = "button";
    purchaseButton.textContent = "구매";

    // DB에서 받은 문자열은 HTML로 해석하지 않고 텍스트로 표시합니다.
    title.textContent = book.title;
    author.textContent = book.author;
    price.textContent = formatPrice(book.price);

    purchaseButton.addEventListener("click", () => {
      purchaseBook(book, quantityInput, purchaseButton);
    });

    purchaseControls.append(quantityInput, purchaseButton);
    card.append(title, author, price, purchaseControls);
    bookList.append(card);
  }
}

async function loadBooks() {
  const keyword = searchInput.value.trim();

  setStatus("도서 목록을 불러오는 중입니다.");
  resultCount.textContent = "";
  bookList.replaceChildren();

  let query = sb
    .from("books")
    .select("id, title, author, price")
    .order("id", { ascending: true });

  // 검색어가 있을 때만 제목에 포함된 도서를 like로 찾습니다.
  if (keyword) {
    query = query.like("title", `%${keyword}%`);
  }

  const { data: books, error } = await query;

  if (error) {
    setStatus(`도서 목록을 불러오지 못했습니다: ${error.message}`, true);
    return;
  }

  if (!books || books.length === 0) {
    setStatus("검색 결과가 없습니다.");
    resultCount.textContent = "0권";
    return;
  }

  statusMessage.hidden = true;
  resultCount.textContent = `${books.length}권`;
  showBooks(books);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadBooks();
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signIn();
});

signUpButton.addEventListener("click", signUp);
signInButton.addEventListener("click", signIn);
signOutButton.addEventListener("click", signOut);

// 인증 상태가 바뀌면 화면만 즉시 갱신합니다. 여기서 비동기 작업은 하지 않습니다.
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthView(session);
});

restoreSession();
loadBooks();
