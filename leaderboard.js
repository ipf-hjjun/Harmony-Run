(function () {
  "use strict";

  var STORAGE_KEY_PLAYER_NAME = "trex.playerName";

  function $(id) {
    return document.getElementById(id);
  }

  function getPlayerName() {
    try {
      return String(localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setPlayerName(name) {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);
    } catch (e) {
      // Ignore storage failures.
    }
  }

  function normalizeName(raw) {
    var name = String(raw || "").trim();
    name = name.replace(/\s+/g, " ");
    if (name.length > 20) name = name.slice(0, 20);
    return name;
  }

  function createSupabaseClient() {
    var url = window.TREX_SUPABASE_URL;
    var anonKey = window.TREX_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    if (!window.supabase || typeof window.supabase.createClient !== "function")
      return null;
    return window.supabase.createClient(url, anonKey);
  }

  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.classList.add("hidden");
    else el.classList.remove("hidden");
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = text;
  }

  function isOverlayVisible(overlayEl) {
    if (!overlayEl) return false;
    return !overlayEl.classList.contains("hidden");
  }

  function showOverlay(overlayEl) {
    setHidden(overlayEl, false);
  }

  function hideOverlay(overlayEl) {
    setHidden(overlayEl, true);
  }

  function renderLeaderboard(listEl, rows, highlight) {
    listEl.innerHTML = "";

    if (!rows || !rows.length) {
      var empty = document.createElement("li");
      empty.className = "trex-leaderboard__item trex-leaderboard__item--empty";
      empty.textContent = "No scores yet.";
      listEl.appendChild(empty);
      return;
    }

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var item = document.createElement("li");
      item.className = "trex-leaderboard__item";

      var left = document.createElement("span");
      left.className = "trex-leaderboard__name";
      left.textContent = i + 1 + ". " + String(row.name || "Anonymous");

      var right = document.createElement("span");
      right.className = "trex-leaderboard__score";
      right.textContent = String(row.score);

      item.appendChild(left);
      item.appendChild(right);

      if (highlight && highlight.name && highlight.score != null) {
        if (
          String(row.name) === highlight.name &&
          Number(row.score) === Number(highlight.score)
        ) {
          item.classList.add("trex-leaderboard__item--highlight");
        }
      }

      listEl.appendChild(item);
    }
  }

  function onDocumentLoad() {
    var overlayEl = $("messageBox");
    var titleEl = $("trex-overlay-title");
    var statusEl = $("trex-overlay-status");
    var submitStatusEl = $("trex-submit-status");
    var nameInputEl = $("trex-player-name");
    var startButtonEl = $("trex-start");
    var leaderboardEl = $("trex-leaderboard");
    var refreshButtonEl = $("trex-refresh");
    var leaderboardListEl = $("trex-leaderboard-list");

    var supabaseClient = createSupabaseClient();
    var lastHighlight = null;

    function setOverlayStatus(text) {
      setText(statusEl, text || "");
    }

    function setSubmitStatus(text) {
      setText(submitStatusEl, text || "");
    }

    function updateNameUI() {
      var current = getPlayerName();
      if (nameInputEl) nameInputEl.value = current;
    }

    async function fetchTop10() {
      if (!supabaseClient) {
        setSubmitStatus("Leaderboard disabled (missing Supabase config).");
        return [];
      }

      setSubmitStatus("Loading leaderboard...");
      var result = await supabaseClient
        .from("scores")
        .select("name, score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(10);

      if (result.error) {
        setSubmitStatus("Failed to load leaderboard: " + result.error.message);
        return [];
      }

      setSubmitStatus("");
      return result.data || [];
    }

    async function fetchTop1Score() {
      if (!supabaseClient) return null;
      var result = await supabaseClient
        .from("scores")
        .select("score, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1);

      if (result.error) return null;
      if (!result.data || !result.data.length) return null;
      var topScore = Number(result.data[0].score);
      return Number.isNaN(topScore) ? null : topScore;
    }

    function applyServerHighScoreToGame(score) {
      if (score == null) return;
      try {
        if (window.Runner && window.Runner.instance_) {
          var runner = window.Runner.instance_;
          runner.highestScore = Math.max(
            Number(runner.highestScore) || 0,
            Number(score) || 0
          );
          if (
            runner.distanceMeter &&
            typeof runner.distanceMeter.setHighScore === "function"
          ) {
            runner.distanceMeter.setHighScore(runner.highestScore);
          }
        }
      } catch (e) {}
    }

    async function refreshLeaderboard() {
      if (!leaderboardListEl) return;
      var rows = await fetchTop10();
      renderLeaderboard(leaderboardListEl, rows, lastHighlight);
    }

    async function submitScore(score) {
      var name = getPlayerName();
      if (!name) return { ok: false, reason: "missing_name" };
      if (!supabaseClient) return { ok: false, reason: "missing_supabase" };

      setSubmitStatus("Submitting score...");
      var incomingScore = Number(score);
      var insertResult = await supabaseClient.from("scores").insert({
        name: name,
        score: incomingScore,
      });

      if (insertResult.error) {
        setSubmitStatus(
          "Failed to submit score: " + insertResult.error.message
        );
        return { ok: false, reason: "error" };
      }

      setSubmitStatus("Score submitted.");
      lastHighlight = { name: name, score: incomingScore };
      applyServerHighScoreToGame(incomingScore);
      return { ok: true };
    }

    function ensureNameOrExplain() {
      var name = getPlayerName();
      if (name) return true;
      setOverlayStatus("Enter your name first.");
      if (nameInputEl) nameInputEl.focus();
      return false;
    }

    function maybeStartFromOverlay() {
      if (!ensureNameOrExplain()) return;
      hideOverlay(overlayEl);
      setOverlayStatus("");

      try {
        if (
          window.Runner &&
          window.Runner.instance_ &&
          typeof window.Runner.instance_.startGameFromUI === "function"
        ) {
          window.Runner.instance_.startGameFromUI();
        }
      } catch (e) {}
    }

    updateNameUI();
    showOverlay(overlayEl);
    setHidden(leaderboardEl, true);
    setSubmitStatus("");
    setOverlayStatus("");

    // Initialize HI score from Supabase (global best).
    (async function () {
      var topScore = await fetchTop1Score();
      applyServerHighScoreToGame(topScore);
    })();

    if (nameInputEl) {
      nameInputEl.addEventListener("keydown", function (e) {
        // Prevent game controls from triggering while typing.
        e.stopPropagation();

        // Disallow spaces to avoid accidental jump/start.
        if (e.keyCode === 32) {
          e.preventDefault();
        }
      });

      nameInputEl.addEventListener("input", function () {
        var normalized = normalizeName(nameInputEl.value);
        if (nameInputEl.value !== normalized) nameInputEl.value = normalized;
      });
    }

    if (startButtonEl) {
      startButtonEl.addEventListener("click", function () {
        var normalized = normalizeName(nameInputEl ? nameInputEl.value : "");
        if (normalized) setPlayerName(normalized);
        maybeStartFromOverlay();
      });
    }

    if (refreshButtonEl) {
      refreshButtonEl.addEventListener("click", function () {
        refreshLeaderboard();
      });
    }

    // Intercept start/restart keys when the overlay is visible.
    document.addEventListener(
      "keydown",
      function (e) {
        if (!isOverlayVisible(overlayEl)) return;
        if (document.activeElement === nameInputEl) return;

        // Space / Up.
        if (e.keyCode === 32 || e.keyCode === 38) {
          if (!ensureNameOrExplain()) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          hideOverlay(overlayEl);
        }
      },
      true
    );

    // Game -> UI bridge.
    window.addEventListener("trex:gameover", function (e) {
      var score = e && e.detail ? Number(e.detail.score) : null;
      if (score == null || Number.isNaN(score)) return;

      showOverlay(overlayEl);
      setHidden(leaderboardEl, false);
      setText(titleEl, "Game Over");
      setOverlayStatus("Press Space to restart.");

      (async function () {
        var submitResult = await submitScore(score);
        if (!submitResult.ok) {
          if (submitResult.reason === "missing_name") {
            setSubmitStatus("Enter your name to submit scores.");
          } else if (submitResult.reason === "missing_supabase") {
            setSubmitStatus("Leaderboard disabled (missing Supabase config).");
          }
        }
        await refreshLeaderboard();
      })();
    });

    // When the user restarts, switch the overlay back to the start state.
    window.addEventListener("trex:restart", function () {
      if (isOverlayVisible(overlayEl)) {
        hideOverlay(overlayEl);
      }
      setText(titleEl, "Press Space to start");
      setHidden(leaderboardEl, true);
      setOverlayStatus("");
      setSubmitStatus("");
      lastHighlight = null;
    });
  }

  document.addEventListener("DOMContentLoaded", onDocumentLoad);
})();
