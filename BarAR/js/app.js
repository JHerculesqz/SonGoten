/* =========================================================================
   LOOPIN · AR 酒单
   MindAR image tracking + A-Frame + HTMLAudio narration
   ========================================================================= */
(function () {
  'use strict';

  /* -----------------------------------------------------------------------
     Cocktail data (loaded from data/data.json)
     ----------------------------------------------------------------------- */
  var COCKTAILS = [];
  var dataReady = false;
  var activeEntry = null;
  var activeTargetIndex = -1;
  var characterName = 'SARA';

  var SILENT_AUDIO = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  /* -----------------------------------------------------------------------
     Interface language (story text and narration stay in Chinese)
     ----------------------------------------------------------------------- */
  var I18N = {
    zh: {
      scanTitle: '把镜头对准酒单',
      scanHint: '保持画面稳定，奇迹会发生',
      storyKicker: 'AR 故事 · 正在播放',
      play: '播放故事',
      pause: '暂停故事',
      resume: '继续故事',
      listenAgain: '再听一次',
      replay: '重播',
      rescan: '重新扫描',
      muteOff: '关闭语音',
      muteOn: '开启语音',
      exitAr: '退出 AR',
      closeStory: '收起故事面板',
      openStory: '打开故事面板',
      tagRole: '虚拟调酒师',
      chooseLanguage: '切换语言',
      landingTagline: '来一场<em>星座与鸡尾酒的化学实验</em>',
      landingCopy: '把镜头对准酒单，<br>虚拟调酒师 <strong>SARA</strong> 会从卡片里走出来，<br>为你讲述这杯鸡尾酒的故事。',
      landingStart: '开始体验',
      landingPreparing: '正在准备 AR…',
      statusStarting: '正在启动摄像头',
      statusSearching: '正在寻找酒单',
      statusFound: '已识别 · {name}',
      statusLost: '已离开酒单 · 请重新对准',
      statusCameraUnavailable: '摄像头不可用',
      loadingModelTitle: '正在下载 AR 依赖的模型',
      loadingModelBody: '正在加载 3D 调酒师与图像识别资源，请稍候…',
      loadingPrepTitle: '正在做 AR 启动准备',
      loadingPrepBody: '正在初始化渲染环境与摄像头组件…',
      loadingCameraTitle: '正在请求摄像头权限',
      loadingCameraBody: '请在浏览器提示中允许访问摄像头。',
      errArEngine: 'AR 引擎未就绪',
      errRefresh: '请刷新页面后重试。',
      errDataLoad: '鸡尾酒数据加载失败',
      errDataLoadBody: '无法读取 12 星座鸡尾酒数据，请刷新页面重试。',
      errCameraStart: '无法启动摄像头',
      errCameraStartBody: '请确认页面通过 HTTPS 打开，并允许摄像头权限。',
      errCameraTimeout: '摄像头启动超时',
      errCameraTimeoutBody: '请确认页面通过 HTTPS 打开，并允许摄像头权限后重试。',
      errCameraAccess: '无法访问摄像头',
      errCameraAccessBody: '请允许摄像头权限，并确认页面通过 HTTPS 打开。如果使用微信等 App 内浏览器，请改用 Safari 或 Chrome。',
      errArFailed: 'AR 启动失败',
      errArFailedBody: '请刷新页面重试。',
      errPageLoad: '页面加载失败',
      errPageLoadBody: '未找到 AR 场景，请刷新页面重试。',
      errArLoad: 'AR 加载失败',
      errArLoadBody: '3D 引擎加载超时，请检查网络后刷新页面重试。',
      retry: '重试',
      back: '返回',
      toastArLoading: 'AR 仍在加载，请稍候再试',
      toastCameraReady: '摄像头已就绪，请对准酒单',
      toastCharacter: '{character} 已出现，正在讲述 {drink} 的故事',
      toastLost: '已离开酒单，故事暂停',
      toastPaused: '故事已暂停，点 {character} 标签可继续',
      toastReplay: '从头开始讲述 {drink} 的故事',
      toastRelocked: '酒单仍在画面中，已重新锁定',
      toastMuted: '语音已关闭，改为字幕模式',
      toastUnmuted: '语音已开启',
      toastEnded: '故事讲完了，点“重听”再听一次',
      toastAudioFallback: '音频暂不可用，已切换为字幕模式',
      gameCenter: '游戏中心',
      toastGameComing: '游戏中心正在建设中，敬请期待'
    },
    en: {
      scanTitle: 'Aim at the menu',
      scanHint: 'Hold steady — magic will happen',
      storyKicker: 'AR STORY · NOW PLAYING',
      play: 'Play Story',
      pause: 'Pause Story',
      resume: 'Resume Story',
      listenAgain: 'Listen Again',
      replay: 'Replay',
      rescan: 'Rescan',
      muteOff: 'Mute narration',
      muteOn: 'Unmute narration',
      exitAr: 'Exit AR',
      closeStory: 'Close story panel',
      openStory: 'Open story panel',
      tagRole: 'Virtual Bartender',
      chooseLanguage: 'Change language',
      landingTagline: 'A chemistry experiment of <em>constellations and cocktails</em>',
      landingCopy: 'Point your camera at the menu.<br>Virtual bartender <strong>SARA</strong> will step out of the card<br>and tell you the story of this cocktail.',
      landingStart: 'Start Experience',
      landingPreparing: 'Preparing AR…',
      statusStarting: 'Starting camera',
      statusSearching: 'Looking for the menu',
      statusFound: 'Found · {name}',
      statusLost: 'Menu lost · Re-aim',
      statusCameraUnavailable: 'Camera unavailable',
      loadingModelTitle: 'Downloading AR model',
      loadingModelBody: 'Loading the 3D bartender and image targets…',
      loadingPrepTitle: 'Preparing AR',
      loadingPrepBody: 'Initializing the renderer and camera…',
      loadingCameraTitle: 'Requesting camera access',
      loadingCameraBody: 'Please allow camera access in the browser prompt.',
      errArEngine: 'AR engine not ready',
      errRefresh: 'Please refresh and try again.',
      errDataLoad: 'Cocktail data failed to load',
      errDataLoadBody: 'Could not read the 12 zodiac cocktail data. Refresh and try again.',
      errCameraStart: 'Unable to start camera',
      errCameraStartBody: 'Please open the page over HTTPS and allow camera access.',
      errCameraTimeout: 'Camera start timed out',
      errCameraTimeoutBody: 'Check HTTPS and camera permission, then try again.',
      errCameraAccess: 'Camera access failed',
      errCameraAccessBody: 'Allow camera access and use HTTPS. If you are in an in-app browser, open in Safari or Chrome.',
      errArFailed: 'AR failed to start',
      errArFailedBody: 'Please refresh and try again.',
      errPageLoad: 'Page failed to load',
      errPageLoadBody: 'AR scene not found. Please refresh and try again.',
      errArLoad: 'AR failed to load',
      errArLoadBody: '3D engine load timed out. Check your network and refresh.',
      retry: 'Retry',
      back: 'Back',
      toastArLoading: 'AR is still loading — try again shortly',
      toastCameraReady: 'Camera ready — aim at the menu',
      toastCharacter: '{character} is here to tell the story of {drink}',
      toastLost: 'Menu lost — story paused',
      toastPaused: 'Story paused. Tap the {character} tag to continue',
      toastReplay: 'Replaying the story of {drink}',
      toastRelocked: 'Menu still in view — re-locked',
      toastMuted: 'Narration off — subtitles on',
      toastUnmuted: 'Narration on',
      toastEnded: 'Story complete — tap Replay to hear it again',
      toastAudioFallback: 'Audio unavailable — subtitles only',
      gameCenter: 'Game Center',
      toastGameComing: 'Game Center is being built — stay tuned'
    },
    'zh-Hant': {
      scanTitle: '把鏡頭對準酒單',
      scanHint: '保持畫面穩定，奇蹟會發生',
      storyKicker: 'AR 故事 · 正在播放',
      play: '播放故事',
      pause: '暫停故事',
      resume: '繼續故事',
      listenAgain: '再聽一次',
      replay: '重播',
      rescan: '重新掃描',
      muteOff: '關閉語音',
      muteOn: '開啟語音',
      exitAr: '退出 AR',
      closeStory: '收起故事面板',
      openStory: '開啟故事面板',
      tagRole: '虛擬調酒師',
      chooseLanguage: '切換語言',
      landingTagline: '來一場<em>星座與雞尾酒的化學實驗</em>',
      landingCopy: '把鏡頭對準酒單，<br>虛擬調酒師 <strong>SARA</strong> 會從卡片裡走出來，<br>為你講述這杯雞尾酒的故事。',
      landingStart: '開始體驗',
      landingPreparing: '正在準備 AR…',
      statusStarting: '正在啟動相機',
      statusSearching: '正在尋找酒單',
      statusFound: '已識別 · {name}',
      statusLost: '已離開酒單 · 請重新對準',
      statusCameraUnavailable: '相機不可用',
      loadingModelTitle: '正在下載 AR 依賴的模型',
      loadingModelBody: '正在載入 3D 調酒師與圖像識別資源，請稍候…',
      loadingPrepTitle: '正在做 AR 啟動準備',
      loadingPrepBody: '正在初始化渲染環境與相機元件…',
      loadingCameraTitle: '正在請求相機權限',
      loadingCameraBody: '請在瀏覽器提示中允許存取相機。',
      errArEngine: 'AR 引擎尚未就緒',
      errRefresh: '請重新整理頁面後再試。',
      errDataLoad: '雞尾酒資料載入失敗',
      errDataLoadBody: '無法讀取 12 星座雞尾酒資料，請重新整理頁面後再試。',
      errCameraStart: '無法啟動相機',
      errCameraStartBody: '請確認頁面以 HTTPS 開啟，並允許相機權限。',
      errCameraTimeout: '相機啟動逾時',
      errCameraTimeoutBody: '請確認頁面以 HTTPS 開啟並允許相機權限後再試。',
      errCameraAccess: '無法存取相機',
      errCameraAccessBody: '請允許相機權限，並確認頁面以 HTTPS 開啟。若使用微信等 App 內瀏覽器，請改用 Safari 或 Chrome。',
      errArFailed: 'AR 啟動失敗',
      errArFailedBody: '請重新整理頁面後再試。',
      errPageLoad: '頁面載入失敗',
      errPageLoadBody: '找不到 AR 場景，請重新整理頁面後再試。',
      errArLoad: 'AR 載入失敗',
      errArLoadBody: '3D 引擎載入逾時，請檢查網路後重新整理頁面。',
      retry: '重試',
      back: '返回',
      toastArLoading: 'AR 仍在載入，請稍候再試',
      toastCameraReady: '相機已就緒，請對準酒單',
      toastCharacter: '{character} 已出現，正在講述 {drink} 的故事',
      toastLost: '已離開酒單，故事暫停',
      toastPaused: '故事已暫停，點 {character} 標籤可繼續',
      toastReplay: '從頭開始講述 {drink} 的故事',
      toastRelocked: '酒單仍在畫面中，已重新鎖定',
      toastMuted: '語音已關閉，改為字幕模式',
      toastUnmuted: '語音已開啟',
      toastEnded: '故事講完了，點「重聽」再聽一次',
      toastAudioFallback: '音訊暫時無法使用，已切換為字幕模式',
      gameCenter: '遊戲中心',
      toastGameComing: '遊戲中心正在建設中，敬請期待'
    },
    ja: {
      scanTitle: 'メニューにカメラを向けてください',
      scanHint: '画面を安定させて。奇跡が起こります',
      storyKicker: 'AR ストーリー · 再生中',
      play: '再生',
      pause: '一時停止',
      resume: '再開',
      listenAgain: 'もう一度',
      replay: 'リプレイ',
      rescan: '再スキャン',
      muteOff: '音声をオフ',
      muteOn: '音声をオン',
      exitAr: 'AR を終了',
      closeStory: 'ストーリーパネルを閉じる',
      openStory: 'ストーリーパネルを開く',
      tagRole: 'バーチャルバーテンダー',
      chooseLanguage: '言語を切り替え',
      landingTagline: '<em>星座とカクテルの化学実験</em>をはじめよう',
      landingCopy: 'カメラをメニューに向けてください。<br>バーチャルバーテンダー <strong>SARA</strong> がカードから飛び出し、<br>このカクテルの物語を語ります。',
      landingStart: '体験をはじめる',
      landingPreparing: 'AR を準備中…',
      statusStarting: 'カメラを起動中',
      statusSearching: 'メニューを探しています',
      statusFound: '認識しました · {name}',
      statusLost: 'メニューを見失いました · 再調整してください',
      statusCameraUnavailable: 'カメラを利用できません',
      loadingModelTitle: 'AR モデルをダウンロード中',
      loadingModelBody: '3D バーテンダーと画像認識リソースを読み込んでいます…',
      loadingPrepTitle: 'AR の起動準備中',
      loadingPrepBody: 'レンダリング環境とカメラを初期化しています…',
      loadingCameraTitle: 'カメラの許可をリクエスト中',
      loadingCameraBody: 'ブラウザのプロンプトでカメラへのアクセスを許可してください。',
      errArEngine: 'AR エンジンの準備ができていません',
      errRefresh: 'ページを再読み込みして再試行してください。',
      errDataLoad: 'カクテルデータの読み込みに失敗しました',
      errDataLoadBody: '12 星座のカクテルデータを読み込めません。ページを再読み込みしてください。',
      errCameraStart: 'カメラを起動できません',
      errCameraStartBody: 'ページが HTTPS で開かれていること、カメラ権限が許可されていることを確認してください。',
      errCameraTimeout: 'カメラの起動がタイムアウトしました',
      errCameraTimeoutBody: 'HTTPS とカメラ権限を確認して再試行してください。',
      errCameraAccess: 'カメラにアクセスできません',
      errCameraAccessBody: 'カメラ権限を許可し、HTTPS で開いてください。アプリ内ブラウザの場合は Safari または Chrome で開いてください。',
      errArFailed: 'AR の起動に失敗しました',
      errArFailedBody: 'ページを再読み込みして再試行してください。',
      errPageLoad: 'ページの読み込みに失敗しました',
      errPageLoadBody: 'AR シーンが見つかりません。ページを再読み込みしてください。',
      errArLoad: 'AR の読み込みに失敗しました',
      errArLoadBody: '3D エンジンの読み込みがタイムアウトしました。ネットワークを確認して再読み込みしてください。',
      retry: '再試行',
      back: '戻る',
      toastArLoading: 'AR を読み込み中です。少し待ってから再試行してください',
      toastCameraReady: 'カメラの準備ができました。メニューに向けてください',
      toastCharacter: '{character} が現れ、{drink} の物語を語っています',
      toastLost: 'メニューを見失いました。ストーリーを一時停止します',
      toastPaused: 'ストーリーを一時停止しました。{character} タグで再開できます',
      toastReplay: '{drink} の物語を最初から再生します',
      toastRelocked: 'メニューはまだ画面内です。再ロックしました',
      toastMuted: '音声をオフにしました。字幕モードに切り替えます',
      toastUnmuted: '音声をオンにしました',
      toastEnded: 'ストーリーが終わりました。「もう一度聞く」で再生できます',
      toastAudioFallback: '音声を再生できないため、字幕モードに切り替えました',
      gameCenter: 'ゲームセンター',
      toastGameComing: 'ゲームセンターは準備中です。お楽しみに'
    },
    ko: {
      scanTitle: '메뉴에 카메라를 맞춰 주세요',
      scanHint: '화면을 안정적으로 유지하세요. 기적이 일어납니다',
      storyKicker: 'AR 스토리 · 재생 중',
      play: '재생',
      pause: '일시정지',
      resume: '계속',
      listenAgain: '다시 듣기',
      replay: '다시 재생',
      rescan: '다시 스캔',
      muteOff: '음성 끄기',
      muteOn: '음성 켜기',
      exitAr: 'AR 종료',
      closeStory: '스토리 패널 닫기',
      openStory: '스토리 패널 열기',
      tagRole: '버추얼 바텐더',
      chooseLanguage: '언어 변경',
      landingTagline: '<em>별자리와 칵테일의 화학 실험</em>을 시작해 보세요',
      landingCopy: '카메라를 메뉴에 비춰 주세요.<br>버추얼 바텐더 <strong>SARA</strong>가 카드에서 걸어 나와<br>이 칵테일의 이야기를 들려줍니다.',
      landingStart: '체험 시작하기',
      landingPreparing: 'AR 준비 중…',
      statusStarting: '카메라 시작 중',
      statusSearching: '메뉴를 찾는 중',
      statusFound: '인식됨 · {name}',
      statusLost: '메뉴를 놓쳤습니다 · 다시 맞춰 주세요',
      statusCameraUnavailable: '카메라를 사용할 수 없음',
      loadingModelTitle: 'AR 모델 다운로드 중',
      loadingModelBody: '3D 바텐더와 이미지 인식 리소스를 불러오는 중…',
      loadingPrepTitle: 'AR 시작 준비 중',
      loadingPrepBody: '렌더링 환경과 카메라를 초기화하는 중…',
      loadingCameraTitle: '카메라 권한 요청 중',
      loadingCameraBody: '브라우저 안내에서 카메라 접근을 허용해 주세요.',
      errArEngine: 'AR 엔진이 준비되지 않았습니다',
      errRefresh: '페이지를 새로고침한 후 다시 시도해 주세요.',
      errDataLoad: '칵테일 데이터 로드 실패',
      errDataLoadBody: '12 별자리 칵테일 데이터를 읽을 수 없습니다. 페이지를 새로고침해 주세요.',
      errCameraStart: '카메라를 시작할 수 없습니다',
      errCameraStartBody: '페이지가 HTTPS로 열려 있고 카메라 권한이 허용되었는지 확인해 주세요.',
      errCameraTimeout: '카메라 시작 시간 초과',
      errCameraTimeoutBody: 'HTTPS와 카메라 권한을 확인한 후 다시 시도해 주세요.',
      errCameraAccess: '카메라에 접근할 수 없습니다',
      errCameraAccessBody: '카메라 권한을 허용하고 HTTPS로 열어 주세요. 앱 내 브라우저라면 Safari 또는 Chrome으로 열어 주세요.',
      errArFailed: 'AR 시작 실패',
      errArFailedBody: '페이지를 새로고침한 후 다시 시도해 주세요.',
      errPageLoad: '페이지 로드 실패',
      errPageLoadBody: 'AR 장면을 찾을 수 없습니다. 페이지를 새로고침해 주세요.',
      errArLoad: 'AR 로드 실패',
      errArLoadBody: '3D 엔진 로드 시간이 초과되었습니다. 네트워크를 확인하고 새로고침해 주세요.',
      retry: '다시 시도',
      back: '돌아가기',
      toastArLoading: 'AR이 아직 로드 중입니다. 잠시 후 다시 시도해 주세요',
      toastCameraReady: '카메라 준비 완료. 메뉴에 맞춰 주세요',
      toastCharacter: '{character}가 나타나 {drink} 이야기를 들려주고 있습니다',
      toastLost: '메뉴를 놓쳤습니다. 스토리를 일시정지합니다',
      toastPaused: '스토리가 일시정지되었습니다. {character} 태그를 눌러 계속하세요',
      toastReplay: '{drink} 이야기를 처음부터 재생합니다',
      toastRelocked: '메뉴가 아직 화면에 있습니다. 다시 고정했습니다',
      toastMuted: '음성을 껐습니다. 자막 모드로 전환합니다',
      toastUnmuted: '음성을 켰습니다',
      toastEnded: '스토리가 끝났습니다. 다시 듣기를 눌러 다시 들어 보세요',
      toastAudioFallback: '오디오를 사용할 수 없어 자막 모드로 전환했습니다',
      gameCenter: '게임 센터',
      toastGameComing: '게임 센터를 준비 중입니다. 기대해 주세요'
    },
    fr: {
      scanTitle: "Visez le menu avec la caméra",
      scanHint: "Gardez l'image stable — la magie va opérer",
      storyKicker: 'AR STORY · EN LECTURE',
      play: 'Lire',
      pause: 'Pause',
      resume: 'Reprendre',
      listenAgain: 'Réécouter',
      replay: 'Rejouer',
      rescan: 'Rescanner',
      muteOff: 'Couper la narration',
      muteOn: 'Activer la narration',
      exitAr: "Quitter l'AR",
      closeStory: "Fermer le panneau d'histoire",
      openStory: "Ouvrir le panneau d'histoire",
      tagRole: 'Barmaid virtuelle',
      chooseLanguage: 'Changer de langue',
      landingTagline: 'Une expérience chimique entre <em>constellations et cocktails</em>',
      landingCopy: "Pointez la caméra vers le menu.<br>La barmaid virtuelle <strong>SARA</strong> sortira de la carte<br>pour vous raconter l'histoire de ce cocktail.",
      landingStart: 'Commencer',
      landingPreparing: "Préparation de l'AR…",
      statusStarting: 'Démarrage de la caméra',
      statusSearching: 'Recherche du menu',
      statusFound: 'Reconnu · {name}',
      statusLost: 'Menu perdu · Réalignez',
      statusCameraUnavailable: 'Caméra indisponible',
      loadingModelTitle: 'Téléchargement du modèle AR',
      loadingModelBody: 'Chargement du barman 3D et des ressources de reconnaissance…',
      loadingPrepTitle: "Préparation de l'AR",
      loadingPrepBody: 'Initialisation du moteur de rendu et de la caméra…',
      loadingCameraTitle: "Demande d'accès à la caméra",
      loadingCameraBody: 'Veuillez autoriser l’accès à la caméra dans la fenêtre du navigateur.',
      errArEngine: 'Moteur AR non prêt',
      errRefresh: 'Veuillez actualiser la page et réessayer.',
      errDataLoad: 'Échec du chargement des cocktails',
      errDataLoadBody: 'Impossible de lire les données des 12 cocktails. Actualisez la page et réessayez.',
      errCameraStart: 'Impossible de démarrer la caméra',
      errCameraStartBody: "Vérifiez que la page est ouverte en HTTPS et que l'accès à la caméra est autorisé.",
      errCameraTimeout: 'Délai de démarrage de la caméra dépassé',
      errCameraTimeoutBody: "Vérifiez le HTTPS et l'autorisation de la caméra, puis réessayez.",
      errCameraAccess: "Accès à la caméra refusé",
      errCameraAccessBody: "Autorisez la caméra et ouvrez la page en HTTPS. Dans un navigateur intégré, utilisez Safari ou Chrome.",
      errArFailed: "Échec du démarrage de l'AR",
      errArFailedBody: 'Veuillez actualiser la page et réessayer.',
      errPageLoad: 'Échec du chargement de la page',
      errPageLoadBody: 'Scène AR introuvable. Actualisez la page et réessayez.',
      errArLoad: "Échec du chargement de l'AR",
      errArLoadBody: 'Le moteur 3D a mis trop de temps à charger. Vérifiez votre réseau et actualisez.',
      retry: 'Réessayer',
      back: 'Retour',
      toastArLoading: "L'AR charge encore — réessayez dans un instant",
      toastCameraReady: 'Caméra prête — visez le menu',
      toastCharacter: "{character} est là pour raconter l'histoire de {drink}",
      toastLost: 'Menu perdu — histoire en pause',
      toastPaused: "Histoire en pause. Touchez l'étiquette {character} pour continuer",
      toastReplay: "Nouvelle lecture de l'histoire de {drink}",
      toastRelocked: 'Le menu est toujours visible — verrouillé à nouveau',
      toastMuted: 'Narration coupée — sous-titres activés',
      toastUnmuted: 'Narration activée',
      toastEnded: 'Histoire terminée — touchez Rejouer pour l’écouter à nouveau',
      toastAudioFallback: 'Audio indisponible — sous-titres uniquement',
      gameCenter: 'Espace jeux',
      toastGameComing: "L'espace jeux est en préparation — à bientôt"
    },
    de: {
      scanTitle: 'Richte die Kamera auf die Karte',
      scanHint: 'Halte das Bild ruhig — gleich geschieht Magie',
      storyKicker: 'AR STORY · LÄUFT',
      play: 'Abspielen',
      pause: 'Pause',
      resume: 'Weiter',
      listenAgain: 'Nochmal',
      replay: 'Wiederholen',
      rescan: 'Neu scannen',
      muteOff: 'Erzählung stummschalten',
      muteOn: 'Erzählung einschalten',
      exitAr: 'AR beenden',
      closeStory: 'Story-Panel schließen',
      openStory: 'Story-Panel öffnen',
      tagRole: 'Virtuelle Barkeeperin',
      chooseLanguage: 'Sprache ändern',
      landingTagline: 'Ein chemisches Experiment aus <em>Sternbildern und Cocktails</em>',
      landingCopy: 'Richte die Kamera auf die Getränkekarte.<br>Die virtuelle Barkeeperin <strong>SARA</strong> tritt aus der Karte hervor<br>und erzählt dir die Geschichte dieses Cocktails.',
      landingStart: 'Erlebnis starten',
      landingPreparing: 'AR wird vorbereitet…',
      statusStarting: 'Kamera wird gestartet',
      statusSearching: 'Getränkekarte wird gesucht',
      statusFound: 'Erkannt · {name}',
      statusLost: 'Karte verloren · Neu ausrichten',
      statusCameraUnavailable: 'Kamera nicht verfügbar',
      loadingModelTitle: 'AR-Modell wird geladen',
      loadingModelBody: '3D-Barkeeper und Bilderkennung werden geladen…',
      loadingPrepTitle: 'AR wird vorbereitet',
      loadingPrepBody: 'Renderer und Kamera werden initialisiert…',
      loadingCameraTitle: 'Kamerazugriff wird angefragt',
      loadingCameraBody: 'Bitte erlaube den Kamerazugriff im Browserdialog.',
      errArEngine: 'AR-Engine nicht bereit',
      errRefresh: 'Bitte lade die Seite neu und versuche es erneut.',
      errDataLoad: 'Cocktail-Daten konnten nicht geladen werden',
      errDataLoadBody: 'Die Daten der 12 Sternzeichen-Cocktails konnten nicht gelesen werden. Bitte lade die Seite neu.',
      errCameraStart: 'Kamera konnte nicht gestartet werden',
      errCameraStartBody: 'Prüfe, ob die Seite über HTTPS geöffnet ist und der Kamerazugriff erlaubt ist.',
      errCameraTimeout: 'Zeitüberschreitung beim Kamerastart',
      errCameraTimeoutBody: 'Prüfe HTTPS und Kameraberechtigung und versuche es erneut.',
      errCameraAccess: 'Kein Kamerazugriff',
      errCameraAccessBody: 'Erlaube den Kamerazugriff und öffne die Seite über HTTPS. In einem In-App-Browser bitte Safari oder Chrome verwenden.',
      errArFailed: 'AR-Start fehlgeschlagen',
      errArFailedBody: 'Bitte lade die Seite neu und versuche es erneut.',
      errPageLoad: 'Seite konnte nicht geladen werden',
      errPageLoadBody: 'AR-Szene nicht gefunden. Bitte lade die Seite neu.',
      errArLoad: 'AR konnte nicht geladen werden',
      errArLoadBody: 'Zeitüberschreitung beim Laden der 3D-Engine. Prüfe das Netzwerk und lade neu.',
      retry: 'Erneut versuchen',
      back: 'Zurück',
      toastArLoading: 'AR lädt noch — versuche es gleich erneut',
      toastCameraReady: 'Kamera bereit — richte sie auf die Karte',
      toastCharacter: '{character} ist da und erzählt die Geschichte von {drink}',
      toastLost: 'Karte verloren — Geschichte pausiert',
      toastPaused: 'Geschichte pausiert. Tippe auf {character}, um fortzufahren',
      toastReplay: 'Geschichte von {drink} wird von Anfang an abgespielt',
      toastRelocked: 'Karte noch sichtbar — erneut fixiert',
      toastMuted: 'Erzählung aus — Untertitel an',
      toastUnmuted: 'Erzählung an',
      toastEnded: 'Geschichte beendet — tippe auf Wiederholen, um sie erneut zu hören',
      toastAudioFallback: 'Audio nicht verfügbar — nur Untertitel',
      gameCenter: 'Spielezentrum',
      toastGameComing: 'Das Spielezentrum wird gerade gebaut — bleib dran'
    }
  };

  var LOCALE_OPTIONS = [
    { id: 'zh', name: '中文', short: '中', htmlLang: 'zh-CN' },
    { id: 'zh-Hant', name: '繁體中文', short: '繁', htmlLang: 'zh-Hant' },
    { id: 'en', name: 'English', short: 'EN', htmlLang: 'en' },
    { id: 'ja', name: '日本語', short: '日', htmlLang: 'ja' },
    { id: 'ko', name: '한국어', short: '한', htmlLang: 'ko' },
    { id: 'fr', name: 'Français', short: 'FR', htmlLang: 'fr' },
    { id: 'de', name: 'Deutsch', short: 'DE', htmlLang: 'de' }
  ];


  /* -----------------------------------------------------------------------
     DOM
     ----------------------------------------------------------------------- */
  var els = {
    landing: document.getElementById('landing'),
    hud: document.getElementById('hud'),
    startBtn: document.getElementById('startBtn'),
    scene: document.getElementById('arScene'),
    targets: [],
    saraCharacter: document.getElementById('saraCharacter'),
    saraIdle: document.getElementById('saraIdle'),
    saraBody: document.getElementById('saraBody'),
    saraCocktail: document.getElementById('saraCocktail'),
    characterTag: document.getElementById('characterTag'),
    scanGuide: document.getElementById('scanGuide'),
    storyPanel: document.getElementById('storyPanel'),
    storyName: document.getElementById('storyName'),
    storySubtitle: document.getElementById('storySubtitle'),
    storyBody: document.getElementById('storyBody'),
    progressFill: document.getElementById('progressFill'),
    audio: document.getElementById('storyAudio'),
    playBtn: document.getElementById('playBtn'),
    replayBtn: document.getElementById('replayBtn'),
    rescanBtn: document.getElementById('rescanBtn'),
    closeStory: document.getElementById('closeStory'),
    muteBtn: document.getElementById('muteBtn'),
    storyMuteBtn: document.getElementById('storyMuteBtn'),
    exitBtn: document.getElementById('exitBtn'),
    gameCenterBtn: document.getElementById('gameCenterBtn'),
    statusPill: document.getElementById('statusPill'),
    statusText: document.getElementById('statusText'),
    toast: document.getElementById('toast'),
    modal: document.getElementById('modal'),
    modalIcon: document.getElementById('modalIcon'),
    modalSpinner: document.getElementById('modalSpinner'),
    modalMark: document.getElementById('modalMark'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalProgress: document.getElementById('modalProgress'),
    modalProgressFill: document.getElementById('modalProgressFill'),
    modalActions: document.getElementById('modalActions'),
    modalAction: document.getElementById('modalAction'),
    modalClose: document.getElementById('modalClose')
  };

  /* -----------------------------------------------------------------------
     State
     ----------------------------------------------------------------------- */
  var started = false;
  var sceneReady = false;
  var arReady = false;
  var targetVisible = false;
  var storyOpen = false;
  var muted = false;
  var pausedByTracking = false;
  var lostTimer = null;
  var arTimeout = null;
  var toastTimer = null;
  var endTimer = null;
  var narrator = null;

  var currentLang = readSavedLocale();
  var currentStatus = { key: 'statusSearching', mode: '', name: '' };
  var currentStartupStage = 0;

  var startupStartedAt = 0;
  var startupTimers = [];
  var startupHideTimer = null;
  var STARTUP_MIN_MS = 1700;
  var STARTUP_STAGE_MS = 550;
  var STARTUP_CAMERA_DELAY_MS = 1400;
  var STARTUP_STAGES = [
    { titleKey: 'loadingModelTitle', bodyKey: 'loadingModelBody', progress: 22 },
    { titleKey: 'loadingPrepTitle', bodyKey: 'loadingPrepBody', progress: 55 },
    { titleKey: 'loadingCameraTitle', bodyKey: 'loadingCameraBody', progress: 80 }
  ];

  /* -----------------------------------------------------------------------
     Small UI helpers
     ----------------------------------------------------------------------- */
  function localeById(id) {
    for (var i = 0; i < LOCALE_OPTIONS.length; i++) {
      if (LOCALE_OPTIONS[i].id === id) return LOCALE_OPTIONS[i];
    }
    return null;
  }

  function readSavedLocale() {
    try {
      var saved = window.localStorage.getItem('barar.locale');
      if (localeById(saved)) return saved;
    } catch (e) { /* ignored */ }
    return 'zh';
  }

  function saveLocale(id) {
    try {
      window.localStorage.setItem('barar.locale', id);
    } catch (e) { /* ignored */ }
  }

  function t(key, vars) {
    var dict = I18N[currentLang] || I18N.zh;
    var text = dict[key];
    if (text == null) text = I18N.en[key];
    if (text == null) text = I18N.zh[key];
    if (text == null) text = key;
    if (vars) {
      for (var name in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, name)) {
          text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), vars[name]);
        }
      }
    }
    return text;
  }

  function applyStatus() {
    if (!els.statusText) return;
    if (currentStatus.key === 'statusFound' && activeEntry) {
      currentStatus.name = drinkName(activeEntry);
    }
    els.statusText.textContent = t(currentStatus.key, { name: currentStatus.name });
    if (!els.statusPill) return;
    els.statusPill.classList.toggle('is-found', currentStatus.mode === 'found');
    els.statusPill.classList.toggle('is-lost', currentStatus.mode === 'lost');
  }

  function setStatus(key, mode, name) {
    currentStatus = { key: key, mode: mode || '', name: name || '' };
    applyStatus();
  }

  function updateMuteButtons() {
    var buttons = [els.muteBtn, els.storyMuteBtn];
    var label = muted ? t('muteOn') : t('muteOff');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (!btn) continue;
      var sound = btn.querySelector('.icon-sound');
      var mutedIcon = btn.querySelector('.icon-muted');
      if (sound) sound.toggleAttribute('hidden', muted);
      if (mutedIcon) mutedIcon.toggleAttribute('hidden', !muted);
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
  }

  function updateLocaleUI() {
    var current = localeById(currentLang) || LOCALE_OPTIONS[0];
    var currents = document.querySelectorAll('.locale-current');
    for (var i = 0; i < currents.length; i++) currents[i].textContent = current.short;

    var pickers = document.querySelectorAll('.locale-picker');
    for (var p = 0; p < pickers.length; p++) {
      var btn = pickers[p].querySelector('.locale-btn');
      if (btn) {
        btn.setAttribute('aria-label', t('chooseLanguage'));
        btn.setAttribute('title', t('chooseLanguage'));
      }
      var menu = pickers[p].querySelector('.locale-menu');
      if (menu) menu.setAttribute('aria-label', t('chooseLanguage'));
      var options = pickers[p].querySelectorAll('.locale-option');
      for (var o = 0; o < options.length; o++) {
        var active = options[o].getAttribute('data-locale') === currentLang;
        options[o].classList.toggle('is-active', active);
        options[o].setAttribute('aria-selected', active ? 'true' : 'false');
      }
    }
  }

  function updateStartButton() {
    if (!els.startBtn || started) return;
    if (!sceneReady) {
      els.startBtn.disabled = true;
      els.startBtn.textContent = t('landingPreparing');
      return;
    }
    enableStart();
  }

  function applyLanguage() {
    var locale = localeById(currentLang) || LOCALE_OPTIONS[0];
    document.documentElement.lang = locale.htmlLang;

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }

    var htmlNodes = document.querySelectorAll('[data-i18n-html]');
    for (var h = 0; h < htmlNodes.length; h++) {
      htmlNodes[h].innerHTML = t(htmlNodes[h].getAttribute('data-i18n-html'));
    }

    updateMuteButtons();
    if (els.exitBtn) {
      els.exitBtn.setAttribute('aria-label', t('exitAr'));
      els.exitBtn.setAttribute('title', t('exitAr'));
    }
    if (els.gameCenterBtn) {
      els.gameCenterBtn.setAttribute('aria-label', t('gameCenter'));
      els.gameCenterBtn.setAttribute('title', t('gameCenter'));
    }
    if (els.closeStory) {
      els.closeStory.setAttribute('aria-label', t('closeStory'));
      els.closeStory.setAttribute('title', t('closeStory'));
    }
    if (els.replayBtn) {
      els.replayBtn.setAttribute('aria-label', t('replay'));
      els.replayBtn.setAttribute('title', t('replay'));
    }
    if (els.rescanBtn) {
      els.rescanBtn.setAttribute('aria-label', t('rescan'));
      els.rescanBtn.setAttribute('title', t('rescan'));
    }
    if (els.characterTag) els.characterTag.setAttribute('aria-label', t('openStory'));

    updateLocaleUI();
    applyStatus();
    if (narrator) updatePlayUI(narrator.state);
    if (els.modalProgress && !els.modalProgress.hidden) setStartupStage(currentStartupStage);
    updateStartButton();
  }

  function setLanguage(next) {
    if (!localeById(next) || next === currentLang) return;
    currentLang = next;
    saveLocale(next);
    applyLanguage();
  }

  function closeLocalePickers(except) {
    var pickers = document.querySelectorAll('.locale-picker.is-open');
    for (var i = 0; i < pickers.length; i++) {
      if (except && pickers[i] === except) continue;
      pickers[i].classList.remove('is-open');
      var menu = pickers[i].querySelector('.locale-menu');
      var btn = pickers[i].querySelector('.locale-btn');
      if (menu) menu.hidden = true;
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleLocalePicker(picker) {
    var wasOpen = picker.classList.contains('is-open');
    closeLocalePickers();
    if (wasOpen) return;
    picker.classList.add('is-open');
    var menu = picker.querySelector('.locale-menu');
    var btn = picker.querySelector('.locale-btn');
    if (menu) menu.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function initLocalePickers() {
    var pickers = document.querySelectorAll('.locale-picker');
    for (var i = 0; i < pickers.length; i++) {
      (function (picker) {
        var menu = picker.querySelector('.locale-menu');
        var btn = picker.querySelector('.locale-btn');
        if (!menu || !btn) return;

        while (menu.firstChild) menu.removeChild(menu.firstChild);
        for (var o = 0; o < LOCALE_OPTIONS.length; o++) {
          var option = document.createElement('button');
          option.type = 'button';
          option.className = 'locale-option';
          option.setAttribute('role', 'option');
          option.setAttribute('data-locale', LOCALE_OPTIONS[o].id);
          option.textContent = LOCALE_OPTIONS[o].name;
          menu.appendChild(option);
        }

        btn.addEventListener('click', function (event) {
          event.stopPropagation();
          toggleLocalePicker(picker);
        });

        menu.addEventListener('click', function (event) {
          var target = event.target;
          var optionEl = target && target.closest ? target.closest('.locale-option') : null;
          if (!optionEl) return;
          setLanguage(optionEl.getAttribute('data-locale'));
          closeLocalePickers();
        });
      })(pickers[i]);
    }

    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest || !target.closest('.locale-picker')) {
        closeLocalePickers();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeLocalePickers();
    });
  }

  function toast(message, duration) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('is-show');
    }, duration || 2800);
  }

  function clearStartupTimers() {
    for (var i = 0; i < startupTimers.length; i++) clearTimeout(startupTimers[i]);
    startupTimers.length = 0;
    if (startupHideTimer) {
      clearTimeout(startupHideTimer);
      startupHideTimer = null;
    }
  }

  function setStartupStage(index) {
    currentStartupStage = Math.min(index, STARTUP_STAGES.length - 1);
    var stage = STARTUP_STAGES[currentStartupStage];
    if (!stage) return;
    if (els.modalTitle) els.modalTitle.textContent = t(stage.titleKey);
    if (els.modalBody) els.modalBody.textContent = t(stage.bodyKey);
    if (els.modalProgressFill) els.modalProgressFill.style.width = stage.progress + '%';
  }

  function beginStartupSequence() {
    clearStartupTimers();
    startupStartedAt = Date.now();
    els.modal.hidden = false;
    els.modalSpinner.hidden = false;
    els.modalMark.hidden = true;
    if (els.modalActions) els.modalActions.hidden = true;
    els.modalAction.hidden = true;
    els.modalClose.hidden = true;
    if (els.modalProgress) els.modalProgress.hidden = false;
    setStartupStage(0);

    for (var i = 1; i < STARTUP_STAGES.length; i++) {
      (function (stageIndex) {
        startupTimers.push(setTimeout(function () {
          if (els.modal.hidden) return;
          setStartupStage(stageIndex);
        }, stageIndex * STARTUP_STAGE_MS));
      })(i);
    }
  }

  // Hold the loading card for a moment even if the camera starts instantly,
  // so the staged messages can actually be read.
  function finishStartupSequence(onHidden) {
    for (var i = 0; i < startupTimers.length; i++) clearTimeout(startupTimers[i]);
    startupTimers.length = 0;
    if (els.modalProgressFill) els.modalProgressFill.style.width = '100%';
    clearTimeout(startupHideTimer);
    var wait = Math.max(0, STARTUP_MIN_MS - (Date.now() - startupStartedAt));
    startupHideTimer = setTimeout(function () {
      startupHideTimer = null;
      hideModal();
      if (onHidden) onHidden();
    }, wait);
  }

  function showError(title, body) {
    clearStartupTimers();
    els.modal.hidden = false;
    els.modalSpinner.hidden = true;
    els.modalMark.hidden = false;
    els.modalTitle.textContent = t(title || 'errArFailed');
    els.modalBody.textContent = t(body || 'errRefresh');
    if (els.modalProgress) els.modalProgress.hidden = true;
    if (els.modalProgressFill) els.modalProgressFill.style.width = '0%';
    if (els.modalActions) els.modalActions.hidden = false;
    els.modalAction.hidden = false;
    els.modalClose.hidden = false;
    setStatus('statusCameraUnavailable', 'lost');
  }

  function hideModal() {
    els.modal.hidden = true;
  }

  function showScanGuide(show) {
    if (!els.scanGuide) return;
    els.scanGuide.classList.toggle('is-hidden', !show);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* -----------------------------------------------------------------------
     Audio priming (unlock HTMLAudioElement on the start gesture)
     ----------------------------------------------------------------------- */
  function primeAudio() {
    try {
      var audio = els.audio;
      if (!audio) return;
      audio.src = SILENT_AUDIO;
      audio.muted = false;
      var p = audio.play();
      var done = function () {
        if (audio.getAttribute('src') !== SILENT_AUDIO) {
          audio.muted = muted;
          return;
        }
        try {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          audio.muted = muted;
        } catch (e) { /* ignored */ }
      };
      if (p && typeof p.then === 'function') p.then(done).catch(done);
      else setTimeout(done, 150);
    } catch (e) { /* ignored */ }
  }

  /* -----------------------------------------------------------------------
     Audio narrator
     ----------------------------------------------------------------------- */
  function AudioNarrator(options) {
    this.audio = options.audio;
    this.onLine = options.onLine || function () {};
    this.onProgress = options.onProgress || function () {};
    this.onState = options.onState || function () {};
    this.onEnd = options.onEnd || function () {};
    this.onError = options.onError || function () {};

    this.lines = [];
    this.entry = null;
    this.index = -1;
    this.state = 'idle';

    var self = this;
    this.audio.addEventListener('timeupdate', function () { self.handleTime(); });
    this.audio.addEventListener('ended', function () { self.handleEnded(); });
    this.audio.addEventListener('error', function () { self.handleError(); });
    this.audio.addEventListener('playing', function () {
      if (self.state === 'speaking') self.onState('speaking');
    });
  }

  AudioNarrator.prototype.setState = function (state) {
    this.state = state;
    this.onState(state);
  };

  AudioNarrator.prototype.load = function (entry) {
    this.entry = entry;
    this.lines = entry && entry.lines ? entry.lines : [];
    this.index = -1;
    this.audio.pause();
    try { this.audio.currentTime = 0; } catch (e) { /* ignored */ }
    this.audio.src = entry ? './' + entry.audio : '';
    this.audio.muted = muted;
    this.audio.load();
    this.setState('idle');
    this.onProgress(0);
  };

  AudioNarrator.prototype.play = function (fromStart) {
    if (!this.entry) return;
    if (fromStart !== false) {
      try { this.audio.currentTime = 0; } catch (e) { /* ignored */ }
      this.index = -1;
    }
    this.setState('speaking');
    var self = this;
    var promise;
    try {
      promise = this.audio.play();
    } catch (e) {
      this.setState('paused');
      return;
    }
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {
        if (self.state === 'speaking') self.setState('paused');
      });
    }
  };

  AudioNarrator.prototype.pause = function () {
    if (this.state !== 'speaking') return;
    this.audio.pause();
    this.setState('paused');
  };

  AudioNarrator.prototype.resume = function () {
    if (!this.entry) return;
    this.setState('speaking');
    var self = this;
    var promise;
    try {
      promise = this.audio.play();
    } catch (e) {
      this.setState('paused');
      return;
    }
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {
        if (self.state === 'speaking') self.setState('paused');
      });
    }
  };

  AudioNarrator.prototype.stop = function () {
    this.audio.pause();
    try { this.audio.currentTime = 0; } catch (e) { /* ignored */ }
    this.index = -1;
    this.setState('idle');
    this.onProgress(0);
  };

  AudioNarrator.prototype.handleTime = function () {
    if (!this.entry || this.state === 'ended') return;
    var duration = this.audio.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    var ratio = Math.min(1, Math.max(0, this.audio.currentTime / duration));
    this.onProgress(ratio);
    if (this.lines.length) {
      var idx = Math.min(this.lines.length - 1, Math.floor(ratio * this.lines.length));
      if (idx !== this.index) {
        this.index = idx;
        this.onLine(idx);
      }
    }
  };

  AudioNarrator.prototype.handleEnded = function () {
    this.setState('ended');
    this.onProgress(1);
    if (this.lines.length) {
      this.index = this.lines.length - 1;
      this.onLine(this.index);
    }
    this.onEnd();
  };

  AudioNarrator.prototype.handleError = function () {
    if (!this.entry) return;
    if (!this.audio.error) return;
    this.setState('paused');
    this.onError();
  };

  /* -----------------------------------------------------------------------
     Story panel
     ----------------------------------------------------------------------- */
  function renderStory(entry) {
    if (!entry) return;
    els.storyName.textContent = entry.cocktail;
    els.storySubtitle.textContent = entry.sign;

    els.storyBody.innerHTML = entry.lines.map(function (line, index) {
      return '<p class="line" data-index="' + index + '">' + escapeHtml(line) + '</p>';
    }).join('');

    setProgress(0);
    setActiveLine(-1);
  }

  function scrollActiveLineIntoView(behavior) {
    var active = els.storyBody.querySelector('.line.is-active');
    if (!active) return;
    var bodyRect = els.storyBody.getBoundingClientRect();
    var activeRect = active.getBoundingClientRect();
    var top = els.storyBody.scrollTop + (activeRect.top - bodyRect.top) -
      (els.storyBody.clientHeight - activeRect.height) / 2;
    if (typeof els.storyBody.scrollTo === 'function') {
      els.storyBody.scrollTo({ top: Math.max(0, top), behavior: behavior || 'smooth' });
    } else {
      els.storyBody.scrollTop = Math.max(0, top);
    }
  }

  function setActiveLine(index) {
    var lines = els.storyBody.querySelectorAll('.line');
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.toggle('is-active', i === index);
    }
    if (index >= 0) scrollActiveLineIntoView('smooth');
  }

  function setProgress(ratio) {
    var pct = Math.max(0, Math.min(1, ratio || 0)) * 100;
    if (els.progressFill) els.progressFill.style.width = pct.toFixed(1) + '%';
  }

  function updatePlayUI(state) {
    var playing = state === 'speaking';
    var playIcon = els.playBtn.querySelector('.ctrl-play');
    var pauseIcon = els.playBtn.querySelector('.ctrl-pause');
    if (playIcon) playIcon.toggleAttribute('hidden', playing);
    if (pauseIcon) pauseIcon.toggleAttribute('hidden', !playing);

    var label;
    if (playing) label = t('pause');
    else if (state === 'paused') label = t('resume');
    else if (state === 'ended') label = t('listenAgain');
    else label = t('play');
    els.playBtn.setAttribute('aria-label', label);
    els.playBtn.setAttribute('title', label);
  }

  function openStoryPanel() {
    els.storyPanel.hidden = false;
    els.characterTag.hidden = false;
    storyOpen = true;
    setTimeout(function () {
      scrollActiveLineIntoView('auto');
    }, 60);
  }

  function closeStoryPanel() {
    els.storyPanel.hidden = true;
    storyOpen = false;
  }

  /* -----------------------------------------------------------------------
     Character helpers
     ----------------------------------------------------------------------- */
  function showCharacter(show) {
    if (els.saraCharacter) els.saraCharacter.setAttribute('visible', show);
    if (els.characterTag) els.characterTag.hidden = !show;
  }

  function drinkName(entry) {
    if (!entry) return '';
    return currentLang === 'zh' || currentLang === 'zh-Hant' ? entry.cocktail : entry.cocktailEn;
  }

  /* -----------------------------------------------------------------------
     AR lifecycle
     ----------------------------------------------------------------------- */
  function startAR() {
    if (started) return;
    if (!els.scene || !els.scene.hasLoaded) {
      toast(t('toastArLoading'));
      return;
    }
    if (!dataReady) {
      toast(t('toastArLoading'));
      return;
    }
    started = true;

    primeAudio();
    els.landing.classList.add('is-leaving');
    setTimeout(function () { els.landing.hidden = true; }, 600);

    els.hud.hidden = false;
    setStatus('statusStarting', '');
    showScanGuide(false);
    beginStartupSequence();

    var system = els.scene.systems['mindar-image-system'];
    if (!system) {
      showError('errArEngine', 'errRefresh');
      return;
    }

    // Let the first loading stages actually paint before MindAR takes over
    // the main thread; otherwise all of them update at once and are hidden.
    setTimeout(function () {
      if (!started) return;
      try {
        system.start();
      } catch (e) {
        showError('errCameraStart', 'errCameraStartBody');
        return;
      }

      clearTimeout(arTimeout);
      arTimeout = setTimeout(function () {
        if (!arReady) {
          showError('errCameraTimeout', 'errCameraTimeoutBody');
        }
      }, 25000);
    }, STARTUP_CAMERA_DELAY_MS);
  }

  function onArReady() {
    arReady = true;
    clearTimeout(arTimeout);
    finishStartupSequence(function () {
      toast(t('toastCameraReady'));
    });
    showScanGuide(true);
    setStatus('statusSearching', '');
  }

  function onArError(event) {
    clearTimeout(arTimeout);
    if (narrator && narrator.state === 'speaking') narrator.pause();
    var reason = event && event.detail ? event.detail.error : '';
    if (reason === 'VIDEO_FAIL') {
      showError('errCameraAccess', 'errCameraAccessBody');
    } else {
      showError('errArFailed', 'errArFailedBody');
    }
  }

  function onTargetFound(index) {
    clearTimeout(lostTimer);
    if (!started) return;
    var entry = COCKTAILS[index];
    if (!entry) return;

    var same = activeEntry && activeEntry.id === entry.id;
    var resumeFromTracking = pausedByTracking;
    targetVisible = true;
    pausedByTracking = false;
    activeTargetIndex = index;

    var targetEl = els.targets[index];
    if (targetEl && els.saraCharacter && els.saraCharacter.object3D.parent !== targetEl.object3D) {
      // Attach in the Three.js graph, not the A-Frame DOM graph. This keeps
      // the loaded glTF alive while following the tracked card's transform.
      targetEl.object3D.add(els.saraCharacter.object3D);
    }
    showCharacter(true);

    if (!same) {
      activeEntry = entry;
      if (els.saraBody && !els.saraBody.getAttribute('gltf-model')) {
        els.saraBody.setAttribute('gltf-model', './assets/models/sara/sara.glb');
      }
      if (els.saraCocktail) {
        els.saraCocktail.setAttribute('gltf-model', './' + entry.cocktailModel);
      }
      narrator.load(entry);
      renderStory(entry);
    }

    showScanGuide(false);
    setStatus('statusFound', 'found', drinkName(entry));
    openStoryPanel();

    if (!same) {
      narrator.play(true);
    } else if (narrator.state === 'paused') {
      if (resumeFromTracking) narrator.resume();
    } else if (narrator.state === 'idle' || narrator.state === 'ended') {
      narrator.play(true);
    }

    toast(t('toastCharacter', { character: characterName, drink: drinkName(entry) }));
  }

  function onTargetLost() {
    clearTimeout(lostTimer);
    lostTimer = setTimeout(function () {
      if (!targetVisible) return;
      targetVisible = false;

      showCharacter(false);
      showScanGuide(true);
      setStatus('statusLost', 'lost');

      if (narrator.state === 'speaking') {
        narrator.pause();
        pausedByTracking = true;
      }
      closeStoryPanel();
      toast(t('toastLost'));
    }, 700);
  }

  function onPlayClick() {
    if (!narrator || !activeEntry) return;

    if (narrator.state === 'speaking') {
      narrator.pause();
      pausedByTracking = false;
      return;
    }
    if (narrator.state === 'paused') {
      narrator.resume();
      pausedByTracking = false;
      return;
    }

    narrator.play(true);
  }

  function onReplayClick() {
    if (!narrator || !activeEntry) return;
    pausedByTracking = false;
    narrator.play(true);
    toast(t('toastReplay', { drink: drinkName(activeEntry) }));
  }

  function onRescanClick() {
    narrator.stop();
    pausedByTracking = false;
    showCharacter(false);
    closeStoryPanel();
    showScanGuide(true);
    setStatus('statusSearching', '');

    // If the card is still in view MindAR will not emit targetFound again,
    // so re-lock after a short beat instead of leaving the user stuck.
    setTimeout(function () {
      if (started && targetVisible && activeEntry) {
        showCharacter(true);
        showScanGuide(false);
        setStatus('statusFound', 'found', drinkName(activeEntry));
        openStoryPanel();
        toast(t('toastRelocked'));
      }
    }, 1600);
  }

  function onCloseStoryClick() {
    narrator.pause();
    pausedByTracking = false;
    closeStoryPanel();
    toast(t('toastPaused', { character: characterName }));
  }

  function onCharacterTagClick() {
    if (!targetVisible) return;
    openStoryPanel();
    if (narrator.state === 'paused') {
      narrator.resume();
      pausedByTracking = false;
    } else if (narrator.state === 'idle' || narrator.state === 'ended') {
      narrator.play(true);
    }
  }

  function toggleMute() {
    muted = !muted;
    if (els.audio) els.audio.muted = muted;
    updateMuteButtons();
    toast(muted ? t('toastMuted') : t('toastUnmuted'));
  }

  function exitAR() {
    if (narrator) narrator.stop();
    clearTimeout(lostTimer);
    clearTimeout(arTimeout);
    try {
      var system = els.scene.systems['mindar-image-system'];
      if (system && arReady) system.stop();
    } catch (e) { /* ignored */ }
    window.location.reload();
  }

  /* -----------------------------------------------------------------------
     Init
     ----------------------------------------------------------------------- */
  function bindUI() {
    els.startBtn.addEventListener('click', startAR);
    els.playBtn.addEventListener('click', onPlayClick);
    els.replayBtn.addEventListener('click', onReplayClick);
    els.rescanBtn.addEventListener('click', onRescanClick);
    els.closeStory.addEventListener('click', onCloseStoryClick);
    els.characterTag.addEventListener('click', onCharacterTagClick);
    els.characterTag.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onCharacterTagClick();
      }
    });
    els.muteBtn.addEventListener('click', toggleMute);
    if (els.storyMuteBtn) els.storyMuteBtn.addEventListener('click', toggleMute);
    els.exitBtn.addEventListener('click', exitAR);
    if (els.gameCenterBtn) {
      els.gameCenterBtn.addEventListener('click', function () {
        toast(t('toastGameComing'), 3200);
      });
    }

    els.modalAction.addEventListener('click', function () { window.location.reload(); });
    els.modalClose.addEventListener('click', function () { window.location.reload(); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && narrator && narrator.state === 'speaking') {
        narrator.pause();
        pausedByTracking = false;
      }
    });

    window.addEventListener('beforeunload', function () {
      if (narrator) narrator.stop();
    });
  }

  function bindScene() {
    if (sceneReady) return;
    sceneReady = true;

    els.scene.addEventListener('arReady', onArReady);
    els.scene.addEventListener('arError', onArError);

    for (var i = 0; i < els.targets.length; i++) {
      (function (index) {
        els.targets[index].addEventListener('targetFound', function () {
          onTargetFound(index);
        });
        els.targets[index].addEventListener('targetLost', onTargetLost);
      })(i);
    }
  }

  function initNarrator() {
    narrator = new AudioNarrator({
      audio: els.audio,
      onLine: setActiveLine,
      onProgress: setProgress,
      onState: updatePlayUI,
      onEnd: function () {
        setProgress(1);
        toast(t('toastEnded'));
      },
      onError: function () {
        toast(t('toastAudioFallback'), 3600);
      }
    });
  }

  function loadCocktails() {
    fetch('./data/data.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        var list = json && json.cocktails ? json.cocktails.slice() : [];
        list.sort(function (a, b) { return a.targetIndex - b.targetIndex; });
        COCKTAILS = list;
        dataReady = list.length === 12;
        if (!dataReady) throw new Error('invalid cocktail data');
      })
      .catch(function (err) {
        console.error('Cocktail data load failed', err);
        showError('errDataLoad', 'errDataLoadBody');
      });
  }

  function init() {
    els.targets = Array.prototype.slice.call(document.querySelectorAll('[mindar-image-target]'));
    loadCocktails();
    initNarrator();
    bindUI();
    initLocalePickers();
    applyLanguage();

    if (els.scene && els.scene.hasLoaded) {
      bindScene();
      enableStart();
    } else if (els.scene) {
      els.scene.addEventListener('loaded', function () {
        bindScene();
        enableStart();
      }, { once: true });
    } else {
      showError('errPageLoad', 'errPageLoadBody');
    }

    // Safety net: never leave the start button disabled forever.
    setTimeout(function () {
      if (sceneReady) enableStart();
    }, 5000);

    // If A-Frame / MindAR never finishes loading, tell the user instead of
    // leaving the landing page stuck on "正在准备 AR…".
    setTimeout(function () {
      if (!sceneReady) {
        showError('errArLoad', 'errArLoadBody');
      }
    }, 25000);
  }

  function enableStart() {
    if (started) return;
    els.startBtn.disabled = false;
    els.startBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/>' +
      '<circle cx="12" cy="12" r="3.2"/></svg>' +
      '<span id="startBtnLabel" data-i18n="landingStart">' + t('landingStart') + '</span>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
