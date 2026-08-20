# UI Backlog

## UI-065 — Add hypothesis Backlog status badge to the experiment detail header, with small labels over all three badges

- **Status:** DONE
- **Priority:** Low
- **Area:** UI / Experiments
- **Type:** Enhancement
- **Summary:** The experiment detail page's badge row currently shows
  two badges — experiment stage (e.g. "Experimentation") and Funnel
  Level (e.g. "Engagement"). Add a third badge for the parent
  hypothesis's Backlog status, and add small grey caption labels above
  all three badges naming what each one is (e.g. "Status Exp",
  "Status Backlog", "Funnel Level" — exact wording to be decided at
  implementation). Screenshot attached, requested 2026-08-20.
- **Description:** `src/app/experiments/[id]/page.tsx:132-140` renders
  the badge row: `Badge` for `currentStage` (experiment stage,
  `STAGE_BADGE_CLASSES`/`stageLabel`) and, if present, `Badge` for
  `experiment.hypothesis.funnelLevel.name`
  (`FUNNEL_LEVEL_BADGE_COLOR`). The Prisma query at line 39-53 already
  `include`s the full `hypothesis` relation, so
  `experiment.hypothesis.status` is already available server-side — no
  new query is needed, just rendering a third `Badge` using the
  existing `STATUS_BADGE_CLASSES`/`STATUS_LABELS` from
  `src/lib/hypothesis.ts` (same source `StatusCell` on `/backlog` uses).
  All three badges need a small grey label above them so it's clear at
  a glance which is the experiment's own stage vs. the hypothesis's
  Backlog status vs. the funnel tag — today's two-badge row has no such
  labeling and relies on the reader recognizing the colors/values.
- **Acceptance Criteria:**
  - The badge row on `/experiments/[id]` shows three badges: experiment
    stage (unchanged), hypothesis Backlog status (new,
    `experiment.hypothesis.status` via `STATUS_BADGE_CLASSES`/`STATUS_LABELS`),
    and Funnel Level (unchanged, still conditional on the hypothesis
    having one).
  - Each badge has a small grey caption above it identifying what it
    represents (experiment status vs. Backlog status vs. Funnel Level).
  - Clicking through / existing links ("Гипотеза" button, "Показать на
    календаре") and the rest of the page are unaffected.
  - No Prisma schema or query changes — `experiment.hypothesis.status`
    is already fetched.
  - Verified in the browser, including an experiment whose hypothesis
    has no Funnel Level set (two badges + labels, no gap where the
    third would be).
- **Files:** `src/app/experiments/[id]/page.tsx:132-140` (badge row),
  `src/lib/hypothesis.ts` (`STATUS_BADGE_CLASSES`/`STATUS_LABELS`,
  reused not duplicated).

## UI-064 — Collapse the Calendar "Требуют внимания" banner into a bell icon with a count badge

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Calendar
- **Type:** Enhancement
- **Summary:** Replace the full-width "Требуют внимания" banner
  (`OverdueExperimentReminder.tsx`) with a small bell icon showing a red
  numeric badge (count of overdue experiments); clicking it opens a
  compact popover with the same per-experiment content and actions the
  banner has today. The red ring highlight on the overdue week cell
  itself (`ExperimentWeekRow.tsx:296`, `ring-2 ring-red-500`) is
  unrelated and stays exactly as-is. Requested 2026-08-20.
- **Description:** Today `OverdueExperimentReminder`
  (`src/app/calendar/OverdueExperimentReminder.tsx`) always renders as a
  full-width amber `<section>` when there are overdue reminders
  (`page.tsx:269`), listing every overdue experiment stacked
  vertically. The user wants this collapsed into a small trigger — a
  bell icon with a small red badge showing the count (e.g. "1", "2") —
  that expands into a popover on click. The popover keeps the exact same
  per-row content and behavior as today's `ReminderRow`: experiment
  name, the "Этап за неделю … ещё не завершён" text, and the two
  actions ("Завершить этап" / "Запланировать следующий этап", including
  the inline stage+date scheduling form that appears under
  "Запланировать") — nothing about `ReminderRow`'s logic changes, only
  its outer container shrinks from a full banner section to a smaller
  popover panel anchored to the bell.
- **Acceptance Criteria:**
  - When there are 0 overdue experiments, nothing renders (same as
    today — no bell, no badge).
  - When there are 1+ overdue experiments, a bell icon renders (in the
    Calendar header area, replacing the banner's position) with a small
    red badge showing the exact count, matching the current "Требуют
    внимания: N" count.
  - Clicking the bell opens a popover, noticeably smaller than today's
    full-width banner, containing the same list of overdue experiments
    with unchanged content and the same two actions per row
    (`ReminderRow`'s `complete()`/`schedule()` logic is reused, not
    rewritten).
  - Completing or scheduling a reminder from inside the popover behaves
    as it does today (row updates/disappears, toast, `router.refresh()`).
  - The badge count updates correctly as reminders are resolved (an
    experiment leaving the overdue list decrements or removes the
    badge).
  - The red ring highlight on the overdue week cell in the grid
    (`ExperimentWeekRow.tsx`) is unchanged by this task.
  - Verified in the browser with 1 and with 2+ overdue experiments.
- **Files:** `src/app/calendar/OverdueExperimentReminder.tsx` (banner →
  bell + popover, `ReminderRow` content/logic reused), `src/app/calendar/page.tsx:269`
  (render site). Not in scope: `ExperimentWeekRow.tsx`'s red ring
  highlight.

## UI-063 — Open "Новая гипотеза" as an overlay modal instead of a separate page

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Backlog
- **Type:** Enhancement
- **Summary:** The "+ Новая гипотеза" button currently navigates to
  `/backlog/new`, a full separate page. User wants the exact same form —
  same fields, same submit behavior, no functional changes — to instead
  open as a modal/overlay floating over the Backlog table, so the user
  never leaves the list view. Requested 2026-08-20.
- **Description:** Today `/backlog/page.tsx` renders "+ Новая гипотеза"
  as a `Link` to `/backlog/new` (`src/app/backlog/page.tsx:158-163`),
  and `src/app/backlog/new/page.tsx` is a standalone page that renders
  `HypothesisForm` with `action={createHypothesis}`. This task swaps the
  navigation for an in-place overlay using the app's existing modal
  pattern — see `MotionDialog` (`src/components/MotionDialog.tsx`),
  already used by `ArchiveHypothesisModal.tsx` and
  `ConvertToExperimentModal.tsx` for the same "float over the current
  list" interaction — rather than introducing a new modal primitive.
  `HypothesisForm` itself, its fields, and the `createHypothesis` Server
  Action are explicitly **not** to change; only how the form is
  presented changes. Per `docs/PROJECT_CONTEXT.md`, creating a
  hypothesis today redirects back to the `/backlog` list (not to the new
  hypothesis's detail page) — that end state (closing back to an updated
  Backlog list, ideally scrolled/highlighted to the new row like other
  "arrive at a row" flows, e.g. `ScrollToHighlighted`) should be
  preserved when closing the modal after a successful create.
- **Acceptance Criteria:**
  - Clicking "+ Новая гипотеза" on `/backlog` opens the hypothesis
    creation form as an overlay above the Backlog table, without a full
    page navigation — the table stays visible/dimmed behind it, matching
    the existing modal pattern used elsewhere in Backlog.
  - The form itself (all fields, layout, validation, submit label) is
    unchanged from the current `/backlog/new` page — this task only
    changes the container it's presented in.
  - Submitting successfully closes the overlay and lands back on
    `/backlog` reflecting the new hypothesis, consistent with today's
    "redirect to the list" behavior.
  - Canceling/dismissing the overlay (backdrop click, Escape, explicit
    close) discards the in-progress form and returns to the plain
    Backlog view with no navigation.
  - Direct navigation to `/backlog/new` (e.g. a bookmarked/shared link)
    still works in some reasonable way — decide at implementation
    whether it keeps working as today's standalone page or redirects
    into `/backlog` with the modal open; either way it must not 404.
  - Verified in the browser: opening, filling out, submitting, and
    canceling the modal all work as described.
- **Files:** `src/app/backlog/page.tsx:158-163` (trigger button),
  `src/app/backlog/new/page.tsx` (current standalone page),
  `src/app/backlog/HypothesisForm.tsx` (form, unchanged),
  `src/components/MotionDialog.tsx` (modal pattern to reuse).

## UI-062 — Backlog Status pill truncates "In progress" — widen STATUS_COL without changing the table's total width

- **Status:** DONE
- **Priority:** Low
- **Area:** UI / Backlog
- **Type:** Bug (visual)
- **Summary:** The Status column's `IconSelect` pill clips the
  `IN_PROGRESS` label to "In progr…" — `STATUS_COL` (`w-36`, 144px in
  `src/components/tableWidths.ts:29`) is too narrow for the longest
  status label plus the pill's leading icon and chevron. User wants the
  column widened just enough to show it in full (screenshot attached,
  2026-08-20), **without changing the Backlog table's overall rendered
  width** — shift width from a neighboring column instead of growing
  the total.
- **Description:** `StatusCell.tsx` renders `IconSelect` in `"pill"`
  variant (`src/components/IconSelect.tsx`), whose `<select>` has
  `max-w-full truncate` — it clips to whatever width its `<td>` (sized
  by `STATUS_COL`) allows. Per the BUG-004 invariant documented at the
  top of `tableWidths.ts`, both Backlog and Experiments must keep a
  fixed total table width with no horizontal scroll — so this is a
  reallocation, not a pure widen: increase `STATUS_COL` by however many
  px are needed for "In progress" (icon + text + chevron, no truncation,
  some breathing room) and remove the same amount from a column with
  slack to spare (candidates already flagged in `tableWidths.ts`'s own
  comments as sized for their content rather than tight: `FUNNEL_LEVEL_COL`
  has ~5px of margin per its comment so it's not a donor; `COMMENT_COL`
  (`w-72`, 288px) is the most likely donor since it's explicitly the one
  column given "spare room" in past passes).
- **Acceptance Criteria:**
  - The `IN_PROGRESS` status pill (longest label, "In progress") renders
    fully in the Backlog list — icon, full text, and chevron all
    visible, no `truncate` ellipsis.
  - Every other status pill (`New`, `Planned`, `Accepted`, `Hold`,
    `Done`) still renders correctly at the new width.
  - Backlog's total table width (`TABLE_CONTENT_WIDTH`/column sum) is
    unchanged — the extra width given to `STATUS_COL` is taken from
    another column, not added on top.
  - The donor column's own content (e.g. Comment text) still reads
    fine and doesn't itself start truncating content that fit before.
  - `StatusCell`'s `IconSelect` usage on `/backlog/[id]` (`variant="field"`,
    not `"pill"`) is unaffected — this task is list-view only.
  - Verified in the browser at the table's normal (desktop) width.
- **Files:** `src/components/tableWidths.ts:29` (`STATUS_COL`),
  `src/app/backlog/page.tsx` (column usage), `src/components/IconSelect.tsx`
  (pill rendering).

## UI-061 — Swap "Accepted" and "In progress" order in the hypothesis status list

- **Status:** DONE
- **Priority:** Low
- **Area:** UI / Backlog
- **Type:** Enhancement
- **Summary:** In the hypothesis status table/legend, `ACCEPTED` should
  come before `IN_PROGRESS`, not after. Requested by the user
  (2026-08-20).
- **Description:** `STATUS_ORDER` in `src/lib/hypothesis.ts:31-38`
  currently lists `NEW, PLANNED, IN_PROGRESS, ACCEPTED, HOLD, DONE`.
  This order drives every place statuses are rendered in sequence
  (status dropdown/legend, any status-sorted list). The user wants
  `ACCEPTED` to appear before `IN_PROGRESS`, matching the intended
  Backlog → Calendar flow (accept, then take into work — see BUG-065),
  so the visual order reads: `NEW, PLANNED, ACCEPTED, IN_PROGRESS, HOLD, DONE`.
- **Acceptance Criteria:**
  - `STATUS_ORDER` reorders to `NEW, PLANNED, ACCEPTED, IN_PROGRESS, HOLD, DONE`.
  - Every UI surface that renders statuses in `STATUS_ORDER` sequence
    (status dropdown/legend on Backlog, and anywhere else it's reused)
    reflects the new order.
  - `HypothesisStatus`'s underlying enum values/labels/colors/icons are
    unchanged — this is a display-order-only change, not a rename or
    data-model change.
  - Verified in the browser.
- **Files:** `src/lib/hypothesis.ts:31-38` (`STATUS_ORDER`).
- **Related:** BUG-065 (status transition on scheduling).

## UI-060 — Контекстные анимации прибытия и навигации между Backlog и Calendar

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Backlog, Calendar
- **Type:** Enhancement
- **Summary:** Добавить короткие анимации, которые сохраняют контекст при возвращении к только что созданной гипотезе, переходе к эксперименту на Calendar и переключении недельного окна, не анимируя весь список или таблицу.
- **Description:**
  В текущем интерфейсе уже есть два важных сигнала контекста: `ScrollToHighlighted` плавно прокручивает к строке, а Backlog/Calendar подсвечивают строку через query-параметр (`hypothesisId`/`experimentId`). Однако сама подсветка статична, а переход между недельными окнами воспринимается как моментальная замена таблицы. Нужно сделать эти изменения состояния понятными и спокойными: новая/найденная строка один раз «прибывает» в фокус (мягкое появление, тонкий янтарный акцент и затухание), а недельное окно Calendar целиком совершает очень короткий направленный переход в сторону навигации. Это motion для continuity, а не последовательная анимация всех строк.
  Не использовать 3D, бесконечные пульсации, scroll-reveal и декоративную анимацию таблицы. Анимации должны быть CSS-first либо использовать нативный механизм перехода представления, если это потребуется для корректной серверной навигации. Учесть `prefers-reduced-motion`: при уменьшенном движении оставить только видимые статические focus/highlight-состояния.
- **Acceptance Criteria:**
  - После создания гипотезы и перехода в Backlog целевая строка прокручивается в область видимости как сейчас и получает одноразовую короткую анимацию прибытия; подсветка не повторяется при обычной прокрутке или обновлении страницы.
  - При переходе по «Показать на календаре» целевой эксперимент остаётся явно видимым в полном таймлайне и получает такой же краткий контекстный акцент на строке и её stage-блоках.
  - При переходе на предыдущую/следующую неделю или «Сегодня» Calendar меняет недельное окно единым коротким направленным переходом; header недель и сетка движутся согласованно, строки не анимируются по одной.
  - Переходы не меняют URL-параметры, фильтры, сортировку, sticky header, фокус с клавиатуры и текущую доменную логику Calendar.
  - При `prefers-reduced-motion: reduce` нет перемещения/масштабирования/пульсации, но остаются доступные статические состояния фокуса и подсветки.
  - Проверено в браузере: создание гипотезы → Backlog, Backlog/карточка → Calendar и навигация недель вперёд/назад/«Сегодня».

## UI-059 — Пространственная обратная связь для переноса и изменения недельного плана Calendar

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Calendar
- **Type:** Enhancement
- **Summary:** Сделать drag-to-move, resize и планирование эксперимента без даты в Calendar визуально непрерывными: с preview целевой недели/диапазона, лёгким glass-состоянием перетаскиваемого элемента и понятным результатом после подтверждения.
- **Description:**
  UI-023 уже ввела подтверждение для переноса и изменения длительности, а `CalendarRowReorderHandle` уже применяет FLIP-анимацию для переупорядочивания строк. Но перетаскивание stage-блока и растягивание сейчас не дают непрерывного визуального preview: пользователь видит только итоговый диалог с диапазоном. Нужна сдержанная пространственная обратная связь в самом календаре: во время drag stage-блок получает временную приподнятую glass-поверхность, целевая неделя/диапазон подсвечиваются до сохранения, а resize показывает будущие добавляемые и удаляемые недели. Для эксперимента из блока «Без даты» header недели должен стать явной drop-zone, после успешного сохранения карточка исчезает из панели, а stage-блок появляется в сетке.
  После подтверждения не создавать новую механику данных и не обходить существующие server actions/проверку коллизий. Использовать transform/opacity, а не анимацию `width`, `left`, `top` или массовые CSS-фильтры на сетке. Glass-эффект допустим только для временно поднятого элемента и preview/drop-zone, не для всей таблицы.
- **Acceptance Criteria:**
  - При переносе stage-блока до подтверждения видны перетаскиваемый элемент и целевая неделя; визуальный preview совпадает с диапазоном в `CalendarPlanChangeDialog`.
  - При растягивании правого края виден preview нового конца блока; добавляемые/сокращаемые недели различимы до подтверждения.
  - Отмена или ошибка сохранения полностью возвращают исходное отображение без визуального «залипания» preview; успешное действие даёт короткое подтверждение в целевой позиции и текущий toast.
  - При drag эксперимента из «Без даты» неделя назначения имеет явное drop-состояние, а после успеха элемент исчезает из панели и появляется в сетке со stage `Discovery`.
  - Существующие жесты, confirm-диалог, проверки пересечений, фильтры, гапы недель, hidden Done-логика и ручной reorder строк работают без регрессии.
  - Animation выполняется плавно на рабочем desktop-viewport и отключает нетривиальное движение при `prefers-reduced-motion: reduce`.
  - Проверено в браузере на move, resize, отмене, конфликте диапазонов и переносе эксперимента без даты.

## UI-058 — Единая система motion-feedback для статусов, меню, модальных окон и toast

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Shared components, Backlog, Experiment card, Calendar
- **Type:** Enhancement
- **Summary:** Ввести единую, сдержанную CSS-first систему коротких анимаций и pending-состояний для изменения статусов/стадий, выбора stage, модальных подтверждений и toast-уведомлений.
- **Description:**
  Пользователь хочет, чтобы рабочий интерфейс ощущался дорогим и плавным, но не был перегружен. В проекте уже есть интерактивные точки, которые сейчас меняются мгновенно: `StageOptionsMenu`, inline `IconSelect` для статусов/стадий, модальные окна подтверждения и `ToastProvider`. Для них нужна одна согласованная motion-шкала: мгновенный feedback 100–150ms, обычная смена состояния 150–250ms, overlay 200–300ms; спокойная ease-out без bounce. Popover и dialog могут получить лёгкую glass-материальность (прозрачная белая поверхность, умеренный backdrop blur, тонкая граница), но таблицы и обычные карточки остаются плоскими согласно DESIGN.md.
  Смена статуса или стадии должна показывать контролируемый transition цвета/иконки и краткое pending-состояние, а не создавать иллюзию долгой загрузки. Toast должен входить/выходить мягко и оставаться доступным для screen reader/keyboard-сценариев. Не добавлять библиотеку анимаций, если CSS и существующие React state/transitions решают задачу; не анимировать каждую строку списка или числовой Score.
- **Acceptance Criteria:**
  - `StageOptionsMenu` открывается и закрывается коротким opacity/transform-переходом, не ломая click-outside, Escape, выбор этапа и позиционирование в Calendar/ленточном редакторе.
  - Inline-изменения статуса гипотезы и стадии эксперимента/недели имеют единый короткий transition семантического цвета и иконки, а pending/error не оставляют контрол в неверном визуальном состоянии.
  - `CalendarPlanChangeDialog`, `HideFromCalendarModal` и archive-модальные окна используют согласованные enter/exit и сдержанный backdrop; закрытие не дольше открытия.
  - Success/error toast появляется и исчезает плавно, остаётся читаемым, не перекрывает критические действия и не накапливает бесконечные анимации.
  - Введены и переиспользуются общие motion tokens/utility-классы; нет копирования несовместимых duration/easing по компонентам.
  - При `prefers-reduced-motion: reduce` функциональность и статусы сохраняются, а несмысловые transform/opacity-анимации отключаются или существенно сокращаются.
  - Проверено в браузере на Calendar, Backlog и карточке эксперимента; проверены success, error, отмена и повторное быстрое действие.

## UI-057 — Переключаемый вид «по неделям» в карточке эксперимента: список vs лента стадий

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Experiment card (ExperimentWeekStagesEditor)
- **Type:** Enhancement
- **Summary:** В блоке «По неделям» карточки эксперимента (`src/app/experiments/ExperimentWeekStagesEditor.tsx`) добавить кнопку-переключатель между текущим отображением (список строк «Неделя от … — дропдаун стадии») и новым компактным видом — горизонтальной лентой, поделённой на цветные сегменты по стадиям (Design/Development/Experimentation/Analysis), с подписями недель. Текущая (по дате) неделя должна визуально выделяться в ленточном виде.
- **Description:**
  Пользователь увидел скриншот текущего списочного вида блока «По неделям» и попросил альтернативный, более компактный способ отображения — по аналогии с диаграммой Ганта, но приспособленный под узкую карточку эксперимента, а не отдельный экран. Из обсуждённых вариантов (Гант / сегментированная лента / степпер) выбор пал на сегментированную ленту: одна горизонтальная полоса, поделённая на цветные блоки по стадиям (использовать существующие цвета/иконки стадий — фиолетовый Design, оранжевый Development, синий Experimentation, зелёный Analysis), с подписями недель под/над лентой. Клик по сегменту должен открывать тот же редактор стадии, что сейчас открывается кликом по квадратику в Calendar (переиспользовать существующий компонент/поповер, не дублировать логику выбора стадии).
  Переключение — кнопка (например иконка-тумблер списка/ленты) в шапке блока «По неделям», рядом с заголовком. Выбор вида должен сохраняться (уточнить при реализации — localStorage на уровне пользователя, или per-experiment, или глобальная настройка; localStorage — самый простой вариант, если нет других требований).
  Текущая неделя (по сегодняшней дате) должна отличаться от остальных заметно — на скриншоте-референсе список не выделяет текущую неделю вообще, лента должна это исправить: например увеличенный/приподнятый сегмент, обводка (`border-strong`/акцентный цвет), либо маркер-точка над сегментом. Итоговый способ выделения — на усмотрение реализации, главное чтобы отличие было однозначно читаемо, а не только на hover.
  Не менять `prisma/schema.prisma` — это чисто UI-задача поверх существующих данных о неделях/стадиях.
- **Acceptance Criteria:**
  - В блоке «По неделям» карточки эксперимента появляется переключатель (кнопка/тумблер) между «список» (текущий вид) и «лента» (новый вид).
  - Вид «лента»: одна горизонтальная полоса, сегментированная по стадиям, с цветами/иконками, соответствующими текущим `STAGE`-константам; подписи недель видны под или над лентой.
  - Клик по сегменту ленты открывает тот же редактор выбора стадии для этой недели, что сейчас используется в списочном виде / в Calendar по клику на квадратик — без дублирования логики.
  - Текущая (по сегодняшней дате) неделя визуально выделена в ленточном виде однозначно отличимым от остальных сегментов способом (не только через hover-состояние).
  - Список (текущий вид) остаётся доступен и работает как сейчас — ничего не удаляется, только добавляется альтернативный вид и переключатель.
  - Выбранный вид отображения сохраняется между посещениями карточки (способ хранения — на усмотрение реализации, например localStorage).
  - Проверено в браузере (dev server) на карточке эксперимента с несколькими неделями разных стадий.

## UI-053 — Закрепить шапку таблиц (Calendar, Backlog, «Показать все эксперименты») при прокрутке

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Calendar, Backlog
- **Type:** UI fix
- **Summary:** Голосовой запрос пользователя: при прокрутке страницы вниз шапка таблицы (названия недель/столбцов) должна оставаться закреплённой наверху, чтобы не терять контекст колонок. Применить к трём таблицам: Calendar (`src/app/calendar/page.tsx`, шапка недель + левая колонка «Эксперимент/Автор/Раскатка»), Backlog (`src/app/backlog/page.tsx`, `<thead>`) и «Показать все эксперименты» (`src/app/calendar/AllExperimentsTable.tsx`, `<thead>`) — единственная сегодня таблица со списком экспериментов (отдельного `/experiments`-списка нет).
- **Description:**
  Все три таблицы уже используют горизонтальную фиксацию (`sticky left-0` на левой колонке Calendar, `TABLE_SURFACE_WIDTH`/`overflow-x-hidden` на Backlog и AllExperimentsTable), но ни у одной нет вертикальной фиксации шапки (`sticky top-0`) — при скролле длинного списка вниз шапка (названия недель в Calendar, названия колонок в Backlog/AllExperimentsTable) уезжает вместе с содержимым.
  - Calendar: строка с шапкой недель (`page.tsx`, `<div className="flex border-b ... bg-zinc-50 ...">`, содержит и левую sticky-колонку «Эксперимент/Автор/Раскатка», и `WeekHeaderCell` на каждую неделю) должна остаться видимой сверху при скролле списка экспериментов вниз.
  - Backlog: `<thead>` (`page.tsx:185-245`) должен остаться видимым сверху при скролле длинного списка гипотез.
  - «Показать все эксперименты»: `<thead>` (`AllExperimentsTable.tsx:211-281`) — то же самое.
- **Acceptance Criteria:**
  - При прокрутке страницы вниз шапка каждой из трёх таблиц (названия недель+колонок в Calendar, названия колонок в Backlog и в AllExperimentsTable) остаётся на месте (прилипает к верху видимой области), а не уезжает вместе со строками.
  - Существующая горизонтальная фиксация (левая колонка Calendar, `overflow-x-hidden`-контейнеры Backlog/AllExperimentsTable) продолжает работать без визуальных конфликтов (z-index, наложение фона) с новой вертикальной фиксацией.
  - Клик/фильтры/сортировка в шапках (HeaderMultiFilter, SortableHeader, WeekStageFilter) продолжают работать как раньше.
  - Ничего не меняется в самих строках таблиц, в данных или в логике фильтрации/сортировки — только визуальное поведение шапки при скролле.

## UI-044 — Увеличить заголовок «Hypothesis Tracker» и убрать «Пользователи»/«События»/«Выйти» в бургер-меню

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / Layout
- **Type:** UI fix
- **Summary:** В хедере приложения (`src/app/layout.tsx`) два отдельных изменения: (1) увеличить размер надписи «Hypothesis Tracker», (2) спрятать пункты «Пользователи», «События» и кнопку «Выйти» в выпадающее мини-меню по иконке трёх горизонтальных полосок (гамбургер), не трогая Backlog/Calendar в основной навигации.
- **Description:**
  Скриншот пользователя, две отметки:
  1. Надпись «Hypothesis Tracker» слева в хедере (`src/app/layout.tsx:39-41`, `<span className="text-lg font-semibold tracking-tight text-zinc-900">`) сейчас `text-lg` — визуально мельче, чем хотелось бы как заголовок бренда приложения. Увеличить размер шрифта (например до `text-xl`/`text-2xl` — подобрать при реализации).
  2. Справа в хедере сейчас видны отдельными элементами: `NavLinks` (`src/app/NavLinks.tsx`) со всеми четырьмя пунктами — Backlog, Calendar, Пользователи, События — рендерит их одинаковыми pill-кнопками без разделения по важности; и рядом, в `layout.tsx:44-49`, форма логаута с именем пользователя и кнопкой «Выйти». Пользователь хочет оставить в основной навигации только Backlog/Calendar (это две главные рабочие вкладки), а «Пользователи», «События» и «Выйти» спрятать за выпадающее мини-меню, открывающееся по иконке трёх горизонтальных полосок (гамбургер) — как компактный вторичный/админский блок, а не наравне с основными разделами.
- **Acceptance Criteria:**
  - Надпись «Hypothesis Tracker» в хедере крупнее текущего `text-lg` (конкретный размер подобрать по вкусу при реализации, сохраняя `font-semibold tracking-tight`).
  - В хедере остаётся видимая основная навигация только на Backlog и Calendar (`NavLinks`, либо её сокращённая версия).
  - Ссылки «Пользователи» и «События», а также кнопка «Выйти» (текущая форма логаута с именем пользователя) перенесены в выпадающее меню, открывающееся по иконке-гамбургеру (три горизонтальные полоски) в правой части хедера.
  - Само меню открывается/закрывается по клику на иконку (и, желательно, по клику вне меню — паттерн уже используется в `RolloutCell.tsx`/аналогичных компонентах с `createPortal`+click-outside — переиспользовать при возможности).
  - Поведение самого логаута (`logout` action, `src/lib/auth/actions.ts`) и переходов на `/users`/`/activity` не меняется — меняется только их расположение/видимость в хедере.
  - Активное состояние (`aria-current`/подсветка) для Backlog/Calendar в основной навигации сохраняется как сейчас.

## UI-043 — Отделить кнопку «Показать все эксперименты» от навигации по неделям в Calendar

- **Status:** DONE
- **Priority:** Low
- **Area:** UI / Calendar
- **Type:** UI fix
- **Summary:** Кнопка «Показать все эксперименты» стоит в одном ряду и без визуального разделения с блоком навигации по неделям (Сегодня / ‹ / ›), из-за чего переключение режима (таймлайн ↔ полный список) путается с навигацией по датам. Перенести её левее, подальше от этой группы.
- **Description:**
  Скриншот пользователя: стрелка указывает на разрыв между заголовком «Calendar» и группой кнопок справа, где «Показать все эксперименты» стоит прямо перед «Сегодня»/‹/› без отступа или разделителя. Текущая вёрстка (`src/app/calendar/page.tsx:194-228`) кладёт обе группы в один общий `<div className="flex items-center gap-2">`: сначала `Link` с `href={showAll ? calendarHref() : "/calendar?calendarView=all"}` (переключатель режима, текст «Показать все эксперименты» / «Таймлайн»), затем (только когда `!showAll`) «Сегодня» и стрелки ‹/›. Визуально все четыре элемента выглядят одной однородной группой кнопок, хотя по смыслу это два разных действия: переключение режима отображения и навигация по датам внутри таймлайна.
- **Acceptance Criteria:**
  - Кнопка «Показать все эксперименты» (и её обратный вариант «Таймлайн» в режиме списка) визуально отделена от группы «Сегодня»/‹/› — например, перенесена к левому краю хедера рядом с заголовком/счётчиком «Calendar», либо оставлена справа, но в отдельной группе с явным отступом/разделителем от Сегодня/‹/›. Конкретный вариант выбрать при реализации.
  - Клик по кнопке и её текущее поведение (переключение `calendarView=all`, сохранение `experimentId`/фильтров через `calendarHref()`) не меняются.
  - Навигация «Сегодня»/‹/› и её текущая логика (disabled-состояние на «Сегодня», сохранение фильтров) не меняются.
  - Правка не переносится на другие элементы хедера (счётчик экспериментов, заголовок «Calendar»), если это не требуется выбранным вариантом.

## UI-023 — Сделать редактирование недельного плана в Calendar обнаружимым и безопасным

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / UX
- **Type:** Enhancement
- **Summary:** Сохранить прямое редактирование недельной сетки Calendar, но сделать перенос и изменение длительности понятными, подтверждаемыми и дополнить сетку вторичным сигналом нагрузки.
- **Description:**
  Calendar — основной desktop-инструмент для контроля текущих экспериментов, смены стадий, планирования следующих недель и оценки распределения нагрузки. Сохраняем существующие прямые жесты: клик по неделе для стадии, drag для переноса и изменение длительности за край блока; не добавляем постоянные отдельные кнопки действий. При наведении и keyboard-focus блок должен явно сообщать, что его можно переносить, а правый край — растягивать. При первом релевантном взаимодействии нужна короткая ненавязчивая подсказка. Перенос и изменение длительности сначала показывают preview нового диапазона и требуют подтверждения; смена стадии одной недели остаётся быстрым действием с явной обратной связью. В заголовке каждой недели добавить компактный вторичный показатель количества активных экспериментов, не конкурирующий с датой и номером недели.
- **Acceptance Criteria:**
  - Клик по недельной ячейке, перенос блока и изменение его длительности остаются доступными без постоянных отдельных кнопок.
  - При наведении и keyboard-focus видно, что блок можно переносить, а его край — растягивать; пользователь получает краткую подсказку о доступных действиях в первом релевантном сценарии.
  - Перед сохранением переноса или изменения длительности показывается новый недельный диапазон и требуется явное подтверждение; отмена не меняет план.
  - После смены стадии недели, подтверждения изменения плана и ошибки сохранения пользователь получает однозначную контекстную обратную связь.
  - Заголовок каждой недели показывает компактное вторичное количество активных экспериментов, не нарушая приоритет даты и номера недели.
  - Сохраняются недельная модель данных, расчёт текущей стадии, фильтры, правила скрытия Done, редактирование из карточки эксперимента и существующий desktop-first подход.
  - Не меняются Prisma-схема, доменная логика, карточки экспериментов и мобильный вариант.

## UI-022 — Сделать таблицы Backlog и Experiments рабочим инструментом сканирования

- **Status:** DONE
- **Priority:** Medium
- **Area:** UI / UX
- **Type:** Enhancement
- **Summary:** Усилить статус и связь «гипотеза ↔ эксперимент» в desktop-first таблицах, не расширяя их до перегруженного представления.
- **Description:**
  Таблицы `/backlog` и `/experiments` рассчитаны на работу с базой до сотен записей. Сохраняем текущую сдержанную визуальную систему, фильтры, сортировки, bulk actions, существующие карточки и доменную логику. В Backlog главным сигналом строки остаётся статус гипотезы, вторым — наличие и актуальное состояние связанных экспериментов. В Experiments главным сигналом остаётся текущая стадия и период, а связь с родительской гипотезой должна быть постоянно доступна. Для длинных имён и комментариев нужен доступный способ получить полный контекст; таблица не должна превращаться в тесное внутреннее окно прокрутки. Мобильный вариант и изменения модели данных не входят в эту задачу.
- **Acceptance Criteria:**
  - Backlog позволяет по каждой строке понять статус гипотезы и наличие, количество либо текущую стадию связанных экспериментов, с переходом к релевантному контексту.
  - Experiments постоянно показывает доступную связь с родительской гипотезой, не заменяя основное открытие карточки эксперимента.
  - Визуальная иерархия строки делает статус главным, связь с экспериментом/гипотезой — вторым, а Score и Funnel Level — поддерживающими сигналами.
  - Длинные названия, комментарии и связанные значения можно прочитать полностью доступным способом без потери текущего контекста.
  - Список остаётся удобным для сканирования нескольких строк: header и колонки не теряют читаемость из-за чрезмерно ограниченной рабочей высоты.
  - Существующие URL-фильтры, сортировки, inline-редактирование статуса/стадии, bulk actions и правила жизненного цикла «гипотеза ↔ эксперимент» работают без изменения.
  - Не меняются карточки `/backlog/[id]` и `/experiments/[id]`, Prisma-схема, доменная логика и мобильный вариант.
