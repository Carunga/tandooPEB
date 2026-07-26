#include <pebble.h>

// tandooPEB - shopping list demo (sample data; Tandoor sync comes later)

typedef struct {
  const char *name;
  const char *amount;
  bool checked;
} ShoppingItem;

static Window *s_window;
static TextLayer *s_title_layer;
static TextLayer *s_count_layer;
static TextLayer *s_updated_layer;
static MenuLayer *s_menu_layer;

static char s_count_buf[24];
static char s_updated_buf[24];

static ShoppingItem s_items[] = {
  { "Milk",           "2 L",      false },
  { "Bread",          "1 loaf",   false },
  { "Eggs",           "12 pcs",   false },
  { "Tomatoes",       "500 g",    false },
  { "Pasta",          "2 packs",  false },
  { "Olive oil",      "1 bottle", false },
  { "Cheese",         "250 g",    false },
  { "Apples",         "6 pcs",    false },
  { "Chicken breast", "400 g",    false },
  { "Coffee",         "500 g",    false },
};
#define NUM_ITEMS (sizeof(s_items) / sizeof(s_items[0]))

#define TITLE_H   26
#define UPDATED_H 18
#define MENU_TOP  (TITLE_H + UPDATED_H + 4)
#define ROW_H     40

// ---------------------------------------------------------------- status bar

static void update_count(void) {
  int checked = 0;
  for (size_t i = 0; i < NUM_ITEMS; i++) {
    if (s_items[i].checked) checked++;
  }
  snprintf(s_count_buf, sizeof(s_count_buf), "%d/%d done", checked, (int)NUM_ITEMS);
  text_layer_set_text(s_count_layer, s_count_buf);
}

static void update_time(void) {
  time_t now = time(NULL);
  struct tm *t = localtime(&now);
  strftime(s_updated_buf, sizeof(s_updated_buf), "Updated %H:%M", t);
  text_layer_set_text(s_updated_layer, s_updated_buf);
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  update_time();
}

// ------------------------------------------------------------------ menu layer

static uint16_t menu_get_num_sections(MenuLayer *menu_layer, void *data) {
  return 1;
}

static uint16_t menu_get_num_rows(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  return NUM_ITEMS;
}

static int16_t menu_get_cell_height(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  return ROW_H;
}

static void menu_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  ShoppingItem *item = &s_items[cell_index->row];
  GRect bounds = layer_get_bounds(cell_layer);
  bool hl = menu_cell_layer_is_highlighted(cell_layer);

  GColor text_color = hl ? GColorWhite : (item->checked ? GColorDarkGray : GColorBlack);
  GColor sub_color = hl ? GColorWhite : GColorDarkGray;

  // checkbox
  GRect box = GRect(5, (bounds.size.h - 14) / 2, 14, 14);
  graphics_context_set_stroke_color(ctx, hl ? GColorWhite : GColorBlack);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_rect(ctx, box);
  if (item->checked) {
    graphics_context_set_stroke_color(ctx, hl ? GColorWhite : GColorGreen);
    graphics_context_set_stroke_width(ctx, 2);
    graphics_draw_line(ctx, GPoint(box.origin.x + 2, box.origin.y + 7),
                       GPoint(box.origin.x + 5, box.origin.y + 11));
    graphics_draw_line(ctx, GPoint(box.origin.x + 5, box.origin.y + 11),
                       GPoint(box.origin.x + 12, box.origin.y + 2));
  }

  // item name
  const int text_x = 26;
  const int text_w = bounds.size.w - text_x - 4;
  GRect name_rect = GRect(text_x, 0, text_w, 22);
  graphics_context_set_text_color(ctx, text_color);
  graphics_draw_text(ctx, item->name, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),
                     name_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  // strikethrough when checked (approximate text width: ~9px/char at 18pt bold)
  if (item->checked) {
    int strike_w = strlen(item->name) * 9;
    if (strike_w > text_w) strike_w = text_w;
    int strike_y = 11;
    graphics_context_set_stroke_color(ctx, text_color);
    graphics_context_set_stroke_width(ctx, 1);
    graphics_draw_line(ctx, GPoint(text_x, strike_y), GPoint(text_x + strike_w, strike_y));
  }

  // amount (subtitle)
  graphics_context_set_text_color(ctx, sub_color);
  graphics_draw_text(ctx, item->amount, fonts_get_system_font(FONT_KEY_GOTHIC_14),
                     GRect(text_x, 21, text_w, 16),
                     GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
}

static void menu_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  s_items[cell_index->row].checked = !s_items[cell_index->row].checked;
  layer_mark_dirty(menu_layer_get_layer(menu_layer));
  update_count();
  vibes_short_pulse();
}

// ---------------------------------------------------------------------- window

static void window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);

  // title bar (full-width colored background via TextLayer bg)
  s_title_layer = text_layer_create(GRect(0, 0, bounds.size.w, TITLE_H));
  text_layer_set_background_color(s_title_layer, GColorDarkCandyAppleRed);
  text_layer_set_text_color(s_title_layer, GColorWhite);
  text_layer_set_font(s_title_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text(s_title_layer, " tandooPEB");
  layer_add_child(root, text_layer_get_layer(s_title_layer));

  // checked count, overlaid on the right of the title bar
  s_count_layer = text_layer_create(GRect(bounds.size.w - 84, 5, 80, 18));
  text_layer_set_background_color(s_count_layer, GColorClear);
  text_layer_set_text_color(s_count_layer, GColorWhite);
  text_layer_set_font(s_count_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  text_layer_set_text_alignment(s_count_layer, GTextAlignmentRight);
  layer_add_child(root, text_layer_get_layer(s_count_layer));

  // last-updated line
  s_updated_layer = text_layer_create(GRect(0, TITLE_H + 2, bounds.size.w, UPDATED_H));
  text_layer_set_background_color(s_updated_layer, GColorClear);
  text_layer_set_text_color(s_updated_layer, GColorDarkGray);
  text_layer_set_font(s_updated_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));
  layer_add_child(root, text_layer_get_layer(s_updated_layer));

  // shopping list
  s_menu_layer = menu_layer_create(GRect(0, MENU_TOP, bounds.size.w, bounds.size.h - MENU_TOP));
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks) {
    .get_num_sections = menu_get_num_sections,
    .get_num_rows = menu_get_num_rows,
    .get_cell_height = menu_get_cell_height,
    .draw_row = menu_draw_row,
    .select_click = menu_select_click,
  });
  menu_layer_set_highlight_colors(s_menu_layer, GColorDarkCandyAppleRed, GColorWhite);
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(root, menu_layer_get_layer(s_menu_layer));

  update_count();
  update_time();
}

static void window_unload(Window *window) {
  menu_layer_destroy(s_menu_layer);
  text_layer_destroy(s_updated_layer);
  text_layer_destroy(s_count_layer);
  text_layer_destroy(s_title_layer);
}

// ------------------------------------------------------------------------- app

static void init(void) {
  s_window = window_create();
  window_set_background_color(s_window, GColorWhite);
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(s_window, true);

  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
}

static void deinit(void) {
  window_destroy(s_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
