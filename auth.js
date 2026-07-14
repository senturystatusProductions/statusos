document.addEventListener("DOMContentLoaded", async () => {
  const authScreen = document.getElementById("authScreen");
  const authForm = document.getElementById("authForm");
  const signUpBtn = document.getElementById("signUpBtn");
  const authMessage = document.getElementById("authMessage");
  const emailInput = document.getElementById("authEmail");
  const passwordInput = document.getElementById("authPassword");

  function setMessage(message, isError = false) {
    let text = "";

    if (typeof message === "string") {
      text = message;
    } else if (message?.message) {
      text = message.message;
    } else if (message) {
      try {
        text = JSON.stringify(message);
      } catch {
        text = "Something went wrong.";
      }
    }

    authMessage.textContent = text;
    authMessage.style.color = isError ? "var(--red)" : "";
  }

  function showAuth() {
    authScreen.classList.remove("hidden");
  }

  function hideAuth() {
    authScreen.classList.add("hidden");
  }

  async function startApp() {
    hideAuth();

    if (typeof window.initStatusOSApp === "function") {
      await window.initStatusOSApp();
    }
  }

  try {
    const config = window.STATUSOS_CONFIG;

    if (!config) {
      throw new Error("StatusOS configuration did not load.");
    }

    if (!window.supabase) {
      throw new Error("The Supabase library did not load.");
    }

    const projectUrl = String(config.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
    const publishableKey = String(config.SUPABASE_PUBLISHABLE_KEY || "").trim();

    if (!projectUrl || !publishableKey) {
      throw new Error("Supabase URL or publishable key is missing.");
    }

    const supabaseClient = window.supabase.createClient(projectUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    window.statusOSSupabase = supabaseClient;

    const {
      data: { session },
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (session) {
      await startApp();
    } else {
      showAuth();
    }

    authForm.addEventListener("submit", async event => {
      event.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setMessage("Enter your email and password.", true);
        return;
      }

      setMessage("Signing in...");

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage(error, true);
        return;
      }

      setMessage("");
      await startApp();
    });

    signUpBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email) {
        setMessage("Enter your email address.", true);
        return;
      }

      if (password.length < 6) {
        setMessage("Your password must contain at least 6 characters.", true);
        return;
      }

      setMessage("Creating account...");

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://senturystatusproductions.github.io/statusos/"
        }
      });

      if (error) {
        setMessage(error, true);
        return;
      }

      if (data.session) {
        setMessage("");
        await startApp();
      } else {
        setMessage("Account created. Check your email, confirm it, then return and sign in.");
      }
    });

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await startApp();
      } else {
        showAuth();
      }
    });
  } catch (error) {
    console.error("StatusOS authentication error:", error);
    showAuth();
    setMessage(error, true);
  }
});
