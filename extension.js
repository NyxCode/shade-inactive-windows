const SHADE_TIME = 0.5;
const SHADE_BRIGHTNESS = -0.15;
const SHADE_DESATURATION = 0.2;

const SHADE_IN = { shadeLevel: 1.0, time: SHADE_TIME, transition: 'linear' }
const SHADE_OUT = { shadeLevel: 0.0, time: SHADE_TIME, transition: 'linear' }

const Meta = imports.gi.Meta;
const Lang = imports.lang;
const Tweener = imports.ui.tweener;
const Clutter = imports.gi.Clutter;

let on_window_created;

const WindowShader = new Lang.Class({
    Name: 'WindowShader',

    _init: function(actor) {
        this._desat_effect = new Clutter.DesaturateEffect({ factor: 0.0 });
        this._brightness_effect = new Clutter.BrightnessContrastEffect();
        actor.add_effect(this._desat_effect);
        actor.add_effect(this._brightness_effect);
        this.actor = actor;
        this._enabled = true;
        this._shadeLevel = 0.0;
        this._desat_effect.enabled = (this._shadeLevel > 0);
        this._brightness_effect.enabled = (this._shadeLevel > 0);
    },

    set shadeLevel(level) {
        this._shadeLevel = level;
        this._brightness_effect.set_brightness(level * SHADE_BRIGHTNESS);
        this._desat_effect.set_factor(level * SHADE_DESATURATION);
        this._brightness_effect.enabled = (this._shadeLevel > 0);
        this._desat_effect.enabled = (this._shadeLevel > 0);
    },

    get shadeLevel() {
        return this._shadeLevel;
    }
});

function enable() {
    function use_shader(meta_win) {
    	if (!meta_win)
          return false;
    	var type = meta_win.get_window_type()
    	return (type == Meta.WindowType.NORMAL ||
          		type == Meta.WindowType.DIALOG ||
          		type == Meta.WindowType.MODAL_DIALOG);
    }

    function verifyShader(wa) {
        if (wa._inactive_shader)
            return;
        var meta_win = wa.get_meta_window();
        if (!use_shader(meta_win))
            return;
        wa._inactive_shader = new WindowShader(wa);
        if(!wa._inactive_shader)
            return;
        if (!meta_win.has_focus())
            Tweener.addTween(wa._inactive_shader, SHADE_IN);
    }

    function ignoreShader(window) {
        let isFullscreen = window.is_fullscreen();
        let isMaximizedHorizontally = window.maximized_horizontally;
        let isMaximizedVertically = window.maximized_vertically;
        let isMaximized = isMaximizedVertically && isMaximizedHorizontally;
        return isFullscreen || isMaximized;
    }

    function focus(the_window) {
        global.get_window_actors().forEach(function(wa) {
            verifyShader(wa);
            if (!wa._inactive_shader)
                return;
            let window = wa.meta_window;
            if(ignoreShader(window)) {
              global.log("not applying shaders to '" + window.title + "'")
              return;
            }
            if (the_window == wa.get_meta_window()) {
                Tweener.addTween(wa._inactive_shader, SHADE_OUT);
            } else if(wa._inactive_shader.shadeLevel == 0.0) {
                Tweener.addTween(wa._inactive_shader, SHADE_IN);
            }
        });
    }

    function window_created(__unused_display, the_window) {
        if (use_shader(the_window))
            the_window._shade_on_focus = the_window.connect('focus', focus);
    }

    on_window_created = global.display.connect('window-created', window_created);

    global.get_window_actors().forEach(function(wa) {
        var meta_win = wa.get_meta_window();
        if (!meta_win)
            return;
        verifyShader(wa);
        window_created(null, wa.get_meta_window());
    });
}

function disable() {
    if (on_window_created)
        global.display.disconnect(on_window_created);

    global.get_window_actors().forEach(function(wa) {
        var win = wa.get_meta_window();
        if (win && win._shade_on_focus) {
            win.disconnect(win._shade_on_focus);
            delete win._shade_on_focus;
        }
        if(wa._inactive_shader) {
            wa._inactive_shader.shadeLevel = 0.0;
            wa.remove_effect(wa._inactive_shader._desat_effect);
            wa.remove_effect(wa._inactive_shader._brightness_effect);
            delete wa._inactive_shader;
        }
    });
}
