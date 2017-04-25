/**
 * Created by Greg Zhang on 2017/3/22.
 */
(function (factory, jQuery) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('jquery'));
  } else {
    factory(jQuery);
  }
})(function ($) {
  var inBrowser = typeof window !== 'undefined';
  var UA = inBrowser && window.navigator.userAgent.toLowerCase();
  var isIE = UA && /msie|trident/.test(UA);
  var IE_MODE = document.documentMode;
  var oldValue;

  var NAME_SPACE = 'select';
  var EVENT_NAMES_ANIMATION = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
  var EVENT_NAME_CLICK = 'click.' + NAME_SPACE;
  var EVENT_NAME_MOUSE_ENTER = 'mouseenter.' + NAME_SPACE;
  var EVENT_NAME_MOUSE_LEAVE = 'mouseleave.' + NAME_SPACE;
  var EVENT_NAME_CHANGE = 'change.' + NAME_SPACE;
  var EVENT_NAME_SHOW = 'show.' + NAME_SPACE;
  var EVENT_NAME_HIDE = 'hide.' + NAME_SPACE;
  var EVENT_NAME_RESIZE = 'resize.' + NAME_SPACE;
  var EVENT_NAME_SCROLL = 'scroll.' + NAME_SPACE;
  var CLASS_PLACEMENT_TOP = 'placement-top';
  var CLASS_PLACEMENT_BOTTOM = 'placement-bottom';
  var CLASS_NAME_DISABLED = 'is-disabled';
  var CLASS_NAME_ACTIVE = 'is-active';
  var CLASS_NAME_ROTATE_UP = 'rotate-to-up';
  var TAG_CACHE_NAME = 'sel-tag-dt';
  var DEFAULT_Z_INDEX = 2008;

  var Select = function ($el, options) {
    var select = this;

    var core = {
      defaults: {
        type: 'single', // single, multiple, group
        data: [], // Array [{label: 'Alibaba', value: 1, disabled: true}, {label: 'JD', value: 2}, {label: 'Asiainfo', value: 3}]
        defaultValue: null, // String, Number, Boolean, Array
        filterable: false,
        disabled: false,
        size: 'small', // small, medium, large
        clearable: false,
        name: '',
        placeholder: 'Please select',
        emptyText: 'No matching data',
        multLimit: 0,
        multMaxHeight: 100,
        zIndex: DEFAULT_Z_INDEX,
        onChange: null,
        onShow: null,
        onHide: null
      },
      scrollBarWidth: null,
      cache: {},
      value: null,
      currentPos: 0,
      valueHooks: {
        get: function () {
          return select.value;
        },
        set: function (value) {
          var type = select.type;
          var $dpList = select.$dropdown.find('.gmi-select-dropdown__item');
          var keys = core.getObjectKeys(core.cache, value);
          if (type === 'multiple') {
            $dpList.removeClass(CLASS_NAME_ACTIVE);
            if (isArray(keys) && keys.length > 0) {
              for (var i = 0; i < keys.length; i++) {
                $dpList.filter('[data-index="'+ keys[i] +'"]').addClass(CLASS_NAME_ACTIVE);
              }
            }
            var $tagWrap = select.$input.find('.gmi-select-selection__tag--wrap');
            if (value.length === 0) {
              $tagWrap.hide().siblings('.gmi-select-selection__placeholder').show();
            } else {
              $tagWrap.show().siblings('.gmi-select-selection__placeholder').hide();
            }
            if (oldValue !== undefined && value !== undefined && value.toString() !== oldValue.toString()) {
              core.triggerEvent(EVENT_NAME_CHANGE, {newValue: value});
            } else if ((oldValue === undefined || value === undefined) && value !== oldValue) {
              core.triggerEvent(EVENT_NAME_CHANGE, {newValue: value});
            }
            core.setMultipleSelTag($tagWrap, keys);
            core.setDropDownPosition();
          } else {
            var $input = select.$input.find('.gmi-input__inner');
            $dpList.removeClass(CLASS_NAME_ACTIVE);
            $input.val('');
            if (keys) {
              $dpList.filter('[data-index="'+ keys +'"]').addClass(CLASS_NAME_ACTIVE);
              $input.val(core.cache[keys]['label']);
            }
            if (value !== oldValue) {
              core.triggerEvent(EVENT_NAME_CHANGE, {newValue: value});
            }
          }
          select.value = value;
          oldValue = $.extend(oldValue || [], value);
        }
      },
      init: function () {
        select = $.extend(true, select, core.defaults, options);
        select.barDragging = false;
        core.value = select.type === 'multiple' ? [] : '';
        core.created();
      },
      created: function () {
        var $body = $('body');
        var data = select.data;
        var zIndex = select.zIndex;
        var inputDOM = core.generateInputDOM();
        var dropdownDOM = core.generateDropDownDOM();
        select.$input = $(inputDOM).insertAfter($el);
        select.$dropdown = $(dropdownDOM).appendTo($body).css({
          position: 'absolute',
          zIndex: parseInt(zIndex, 10)
        });

        if (select.onChange) $el.on(EVENT_NAME_CHANGE, select.onChange);
        if (select.defaultValue !== null) core.valueHooks.set(select.defaultValue);

        select.$scrollbar = select.$dropdown.find('.gmi-select-dropdown__inner__bar');
        core.setInnerScrollBarHeight();
        // When the data is illegal or data's length equal 0, show the empty text
        if (!data || !isArray(data) || (isArray(data) && data.length === 0)) {
          select.$dropdown.find('.gmi-select-dropdown__inner__cnt').hide()
            .siblings('.gmi-select-dropdown__inner__empty').show();
        }
        $el.hide();
        core.bindEvent();
      },
      bindEvent: function () {
        var $dpInnerCnt = select.$dropdown.find('.gmi-select-dropdown__inner__cnt');

        $(document).on(EVENT_NAME_CLICK, function () {
          core.hideDropDown();
        });

        // when window resizing that the dropdown will change its position
        $(window).on(EVENT_NAME_RESIZE, function () {
          core.setDropDownPosition();
        });

        // when body scrolling that the dropdown will change its position
        $(window).on(EVENT_NAME_SCROLL, function () {
          core.setDropDownPosition();
        });

        select.$input.on(EVENT_NAME_CLICK, function (e) {
          var $currentTarget = $(e.currentTarget);
          var $target = $(e.target);
          // tag clear method
          if ($target.is('.gmi-tag-icon[data-role="clear"]')) {
            var tagDt = $target.parents('.gmi-tag').eq(0).data(TAG_CACHE_NAME);
            if (isArray(core.value) && core.value.length > 0) {
              if (core.value.indexOf(tagDt['value']) > -1) {
                core.value.splice(core.value.indexOf(tagDt['value']), 1);
                core.valueHooks.set(core.value);
                if (core.value.length === 0) $currentTarget.find('.gmi-input__icon[data-role="clear"]').hide()
                  .siblings('.icon-arrowdown[data-role="arrow"]').show();
              }
            }
            return false;
          }
          // select clear method
          if ($target.is('.gmi-input__icon[data-role="clear"]')) {
            core.reset();
            return false;
          }
          if ($currentTarget.hasClass(CLASS_NAME_DISABLED)) return false;
          core.showDropDown();
          e.stopPropagation();
        }).on(EVENT_NAME_MOUSE_ENTER, function (e) {
          var type = select.type;
          var value = select.value;
          var clearable = select.clearable;
          if (clearable) {
            if (type === 'multiple') {
              if (value && isArray(value) && value.length > 0) {
                var $currentTarget = $(e.currentTarget);
                $currentTarget.find('.gmi-input__icon[data-role="clear"]').show()
                  .siblings('.icon-arrowdown[data-role="arrow"]').hide();
              }
            } else {
              if (value !== undefined && value !== '' && value !== null) {
                var $currentTarget = $(e.currentTarget);
                $currentTarget.find('.gmi-input__icon[data-role="clear"]').show()
                  .siblings('.icon-arrowdown[data-role="arrow"]').hide();
              }
            }
          }
        }).on(EVENT_NAME_MOUSE_LEAVE, function (e) {
          var clearable = select.clearable;
          if (clearable) {
            var $currentTarget = $(e.currentTarget);
            $currentTarget.find('.gmi-input__icon[data-role="clear"]').hide()
              .siblings('.icon-arrowdown[data-role="arrow"]').show();
          }
        });

        select.$dropdown.on(EVENT_NAME_CLICK, function (e) {
          var $target = $(e.target);
          var type = select.type;
          var index;
          var value;
          if ($target.is('.gmi-select-dropdown__item') && !$target.hasClass(CLASS_NAME_DISABLED)) {
            index = $target.data('index');
            value = core.cache[index]['value'];
            if (type === 'multiple') {
              if (core.value.indexOf(value) > -1) {
                core.value.splice(core.value.indexOf(value), 1);
              } else {
                core.value.push(value);
              }
              core.valueHooks.set(core.value);
            } else {
              core.value = value;
              if (!$target.hasClass(CLASS_NAME_ACTIVE)) core.valueHooks.set(core.value);
              core.hideDropDown();
            }
          }
          e.stopPropagation();
        }).on(EVENT_NAME_MOUSE_ENTER, function (e) {
          var $delegateTarget = $(e.delegateTarget);
          var $cntList = $delegateTarget.find('.gmi-select-dropdown__inner__cnt__list');
          var cntListHeight = $cntList.outerHeight();
          var maxHeight = parseInt($dpInnerCnt.css('max-height').replace(/px/, ''), 10);
          if (cntListHeight > maxHeight) {
            select.$scrollbar.css('opacity', 1);
          }
        }).on(EVENT_NAME_MOUSE_LEAVE, function () {
          if (Number(select.$scrollbar.css('opacity')) === 1) select.$scrollbar.css('opacity', 0);
        });

        $dpInnerCnt.on(EVENT_NAME_SCROLL, function (e) {
          var $wrap = $(this).parents('.gmi-select-dropdown__inner').eq(0);
          var scrollBarHeight = select.$scrollbar.height();
          var wrapHeight = $wrap.height();
          var scrollTop = $(this).scrollTop();
          var cntHeight = $(this).find('>.gmi-select-dropdown__inner__cnt__list').height();
          var translateY = (scrollTop / cntHeight) * wrapHeight;
          var scrollBarStyleTop = parseInt(select.$scrollbar.css('top').replace(/px/, ''), 10);
          if (scrollBarHeight + translateY > wrapHeight) {
            select.$scrollbar.css({
              'transform': 'translateY('+ (wrapHeight - scrollBarHeight - scrollBarStyleTop * 2) +'px)',
              '-ms-transform': 'translateY('+ (wrapHeight - scrollBarHeight - scrollBarStyleTop * 2) +'px)'
            });
            core.translateY = wrapHeight - scrollBarHeight - scrollBarStyleTop * 2;
          } else {
            select.$scrollbar.css({
              'transform': 'translateY('+ translateY +'px)',
              '-ms-transform': 'translateY('+ translateY +'px)'
            });
            core.translateY = translateY;
          }
        });

        select.$scrollbar.on('mousedown', function (e) {
          core.onDragStart(e);
          $(window)
            .on('mousemove', core.onDragging)
            .on('mouseup', core.onDragEnd)
            .on('contextmenu', core.onDragEnd);
          e.preventDefault();
        });

        if ($.isFunction(select.onShow)) {
          $el.on(EVENT_NAME_SHOW, select.onShow);
        }

        if ($.isFunction(select.onHide)) {
          $el.on(EVENT_NAME_HIDE, select.onHide);
        }
      },
      generateInputDOM: function () {
        var type = select.type;
        var name = select.name;
        var clearable = select.clearable;
        var placeholder = select.placeholder;
        var maxHeight = select.multMaxHeight;
        var classes = core.getSelInputClasses('input');
        var scrollBarWidth = core.getScrollBarWidth();
        var dom = '';
        dom += '<div class="gmi-select '+ classes +'">';
        if (type === 'single' || type === 'group') {
          dom += '<div class="gmi-input">';
          if (clearable) dom += '<em data-role="clear" class="gmi-input__icon icon-clear1" style="display: none;"></em>';
          dom += '<em data-role="arrow" class="gmi-input__icon icon-arrowdown"></em>' +
            '<input type="text" name="'+ name +'" class="gmi-input__inner" readonly placeholder="'+ placeholder +'">' +
            '</div>' +
            '<div class="resize-triggers"><div class="expand-trigger"></div>' +
            '<div class="contract-trigger"></div></div>';
        } else if (type === 'multiple') {
          dom += '<div class="gmi-select-selection" data-name="'+ name +'">';
          dom += '<div class="gmi-select-selection__inner" style="max-height:'+ maxHeight +'px;margin-right: -'+ scrollBarWidth +'px;margin-bottom: -'+ scrollBarWidth +'px;">' +
              '<div class="gmi-select-selection__tag--wrap" style="display: none;"></div>' +
              '<span class="gmi-select-selection__placeholder">'+ placeholder +'</span>' +
              '<em data-role="arrow" class="gmi-select-selection__icon icon-arrowdown"></em>';
          if (clearable) dom += '<em data-role="clear" class="gmi-input__icon icon-clear1" style="display: none;"></em>';
          dom += '</div>' +
            '</div>';
        }
        dom += '</div>';
        return dom;
      },
      generateDropDownDOM: function () {
        var type = select.type;
        var data = select.data;
        var emptyText = select.emptyText;
        var classes = core.getSelInputClasses('dropdown');
        var scrollBarWidth = core.getScrollBarWidth();
        var dom = '';
        var disabledClass;
        dom += '<div class="gmi-select-dropdown placement-top '+ classes +'" style="left: -9999em;visibility: hidden;">' +
          '<div class="gmi-select-dropdown__inner">' +
          '<div class="gmi-select-dropdown__inner__cnt" style="margin-right: -'+ scrollBarWidth +'px; margin-bottom: -'+ scrollBarWidth +'px">' +
          '<ul class="gmi-select-dropdown__inner__cnt__list">';

        if (type === 'single' || type === 'multiple') {
          for (var i = 0; i < data.length; i++) {
            disabledClass = data[i]['disabled'] ? 'is-disabled' : '';
            dom += '<li data-index="uid'+ i +'" class="gmi-select-dropdown__item '+ disabledClass +'">' + data[i]['label'] + '</li>';
            core.cache['uid' + i] = data[i];
          }
        } else if (type === 'group') {
          for (var i = 0; i < data.length; i++) {
            var dtItem = data[i];
            if ($.isPlainObject(dtItem)) {
              dom += '<ul class="gmi-select-group__wrapper">' +
                '<li class="gmi-select-group__title">'+ dtItem['title'] +'</li>' +
                '<li class="gmi-select-group__cnt">' +
                '<ul class="gmi-select-group">';
                for (var j = 0; j < dtItem['options'].length; j++) {
                  disabledClass = dtItem['options'][j]['disabled'] ? 'is-disabled' : '';
                  dom += '<li data-index="uid'+ i +''+ j +'" class="gmi-select-dropdown__item '+ disabledClass +'">'+ dtItem['options'][j]['label'] +'</li>';
                  core.cache['uid' + i + j] = dtItem['options'][j];
                }
              dom += '</ul>' +
                '</li>' +
                '</ul>';
            }
          }
        }

        dom += '<div class="resize-triggers">' +
          '<div class="expand-trigger"></div>' +
          '<div class="contract-trigger"></div>' +
          '</div>';
        dom += '</ul></div>';
        dom += '<div class="gmi-select-dropdown__inner__bar is-vertical">' +
          '<div class="gmi-select-scrollbar__thumb"></div>' +
          '</div>';
        dom += '<div class="gmi-select-dropdown__inner__empty" style="display: none;">'+ emptyText +'</div>';
        dom += '</div></div>';
        return dom;
      },
      setMultipleSelTag: function ($wrap, keys) {
        var dom;
        $wrap.find('.gmi-tag').remove();
        if (isArray(keys) && keys.length > 0) {
          for (var i = 0; i < keys.length; i++) {
            dom = '<div class="gmi-tag">' +
              '<span class="gmi-tag-text">'+ core.cache[keys[i]]['label'] +'</span>' +
              '<em data-role="clear" class="gmi-tag-icon icon-clear"></em>' +
              '</div>';
            $(dom).appendTo($wrap).data(TAG_CACHE_NAME, core.cache[keys[i]]);
          }
        }
      },
      getSelInputClasses: function () {
        var domType = arguments[0];
        var type = select.type;
        var size = select.size;
        var classes = [];
        if (type === 'group') {
          classes.push('is-group');
        } else if (type === 'multiple') {
          classes.push('is-multiple');
        }
        if (select.clearable && domType === 'input') classes.push('is-clearable');
        if (select.disabled && domType === 'input') classes.push('is-disabled');
        switch (size) {
          case 'small':
            classes.push('');
            break;
          case 'medium':
            classes.push('medium');
            break;
          case 'large':
            classes.push('large');
            break;
          default:
            break;
        }
        return classes.join(' ');
      },
      getProportionWidthCntAndWrap: function () {
        var $dropdown = select.$dropdown;
        var $wrap = $dropdown.find('.gmi-select-dropdown__inner');
        var $cnt = $dropdown.find('.gmi-select-dropdown__inner__cnt__list');
        var wrapHeight = $wrap.outerHeight();
        var cntHeight = $cnt.outerHeight();
        return wrapHeight / cntHeight;
      },
      setInnerScrollBarHeight: function () {
        var $scrollbar = select.$scrollbar;
        var height = $scrollbar.height();
        var proportion = core.getProportionWidthCntAndWrap();
        height = (height * proportion).toFixed(3);
        $scrollbar.css('height', height + 'px');
      },
      getDropDownPosition: function () {
        var $select = select.$input;
        var $dropdown = select.$dropdown;
        var viewHeight = $(window).height();
        var scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop;
        var elHeight = $select.outerHeight();
        var panelHeight = select.$dropdown.outerHeight();
        var top = $select.offset().top;
        var left = $select.offset().left;

        if ((top - scrollTop > panelHeight) && (top - scrollTop + elHeight + panelHeight > viewHeight)) {
          top -= panelHeight + Number(select.$dropdown.css('margin-top').replace(/px/, '')) * 2;
          $dropdown.removeClass(CLASS_PLACEMENT_TOP).addClass(CLASS_PLACEMENT_BOTTOM);
        } else {
          top += elHeight;
          $dropdown.removeClass(CLASS_PLACEMENT_BOTTOM).addClass(CLASS_PLACEMENT_TOP);
        }
        return {top: top, left: left};
      },
      setDropDownPosition: function () {
        var position = core.getDropDownPosition();
        select.$dropdown.css({
          top: position.top + 'px',
          left: position.left + 'px'
        });
      },
      showDropDown: function () {
        var type = select.type;
        var $input = select.$input;
        var $dropdown = select.$dropdown;
        var $arrowIcon = type === 'multiple' ? $input.find('.gmi-select-selection__icon[data-role="arrow"]') : $input.find('.gmi-input__icon[data-role="arrow"]');
        if ($dropdown.css('visibility') === 'visible') return;
        $dropdown.css('visibility', 'visible');
        // set select dropdown position
        core.setDropDownPosition();
        animation($arrowIcon, 'icon-rotate-up', function () {
          $arrowIcon.addClass(CLASS_NAME_ROTATE_UP);
        });
        animation($dropdown, 'dp-show', function () {
          core.triggerEvent(EVENT_NAME_SHOW);
        });

      },
      hideDropDown: function () {
        var type = select.type;
        var $input = select.$input;
        var $arrowIcon = type === 'multiple' ? $input.find('.gmi-select-selection__icon[data-role="arrow"]') : $input.find('.gmi-input__icon[data-role="arrow"]');
        animation(select.$dropdown, 'icon-rotate-down', function () {
          $arrowIcon.removeClass(CLASS_NAME_ROTATE_UP);
        });
        animation(select.$dropdown, 'dp-hide', function () {
          select.$dropdown.css('visibility', 'hidden').css('left', '-9999em');
          core.triggerEvent(EVENT_NAME_HIDE);
        });
      },
      triggerEvent: function (type, data) {
        var evt = $.Event(type, data);
        $el.trigger(evt);
        return evt;
      },
      getScrollBarWidth: function () {
        if (core.scrollBarWidth !== null) return core.scrollBarWidth;

        var documentEl = document.body || document.documentElement;
        var outer = document.createElement('div');
        outer.className = 'gmi-scrollbar';
        outer.style.visibility = 'hidden';
        outer.style.width = '100px';
        outer.style.position = 'absolute';
        outer.style.top = '-9999em';
        documentEl.appendChild(outer);
        var widthOuter = outer.offsetWidth;
        outer.style.overflow = 'scroll';

        var inner = document.createElement('div');
        inner.style.width = '100%';
        outer.appendChild(inner);

        var widthInner = inner.offsetWidth;
        outer.parentNode.removeChild(outer);

        core.scrollBarWidth = widthOuter - widthInner;
        return core.scrollBarWidth;
      },
      onDragStart: function (e) {
        select.barDragging = true;
        core.startY = e.clientY;
        if (isNumber(core.translateY)) core.currentPos = core.translateY;
        select.$scrollbar.css({
          'transform': 'translateY('+ core.currentPos +'px)',
          '-ms-transform': 'translateY('+ core.currentPos +'px)'
        });
      },
      onDragging: function (e) {
        var $wrapper = select.$dropdown.find('.gmi-select-dropdown__inner__cnt');
        var wrapHeight = $wrapper.get(0).clientHeight;
        var scrollbarHeight = select.$scrollbar.outerHeight();
        var scrollBarStyleTop = parseInt(select.$scrollbar.css('top').replace(/px/, ''), 10);
        var proportion = core.getProportionWidthCntAndWrap();
        var diff;
        var translateY = core.currentPos;
        if (select.barDragging) {
          core.currentY = e.clientY;
          diff = core.currentY - core.startY;
          if (core.translateY === undefined) core.translateY = 0;
          if (core.translateY + diff + core.currentPos < 0) {
            translateY = 0;
          } else if (core.currentPos + diff + scrollbarHeight + scrollBarStyleTop >= wrapHeight) {
            translateY = wrapHeight - scrollbarHeight - scrollBarStyleTop * 2;
          } else {
            translateY += diff;
          }
          core.translateY = translateY;
          $wrapper.scrollTop(translateY / proportion);

          select.$scrollbar.css({
            'transform': 'translateY('+ translateY +'px)',
            '-ms-transform': 'translateY('+ translateY +'px)'
          });
        }
      },
      onDragEnd: function (e) {
        if (select.barDragging) {
          setTimeout(function () {
            select.barDragging = false;
          }, 0);
          core.currentPos = core.translateY;
          $(window).off('mousemove', core.onDragging);
          $(window).off('mouseup', core.onDragEnd);
          $(window).off('contextmenu', core.onDragEnd);
        }
      },
      getObjectKeys: function (obj, value) {
        var keys;
        if ($.isPlainObject(obj)) {
          if (isArray(value) && value.length > 0) {
            keys = [];
            for (var k in obj) {
              for (var n = 0; n < value.length; n++) {
                if (obj[k]['value'] === value[n]) {
                  keys.push(k);
                  break;
                }
              }
            }
          } else {
            for (var i in obj) {
              if (obj[i]['value'] === value) {
                keys = i;
                break;
              }
            }
          }
        }
        return keys;
      },
      reset: function () {
        var type = select.type;
        var $clearIcon = select.$input.find('.gmi-input__icon[data-role="clear"]');
        core.valueHooks.set(type === 'multiple' ? [] : '');
        core.value = type === 'multiple' ? [] : '';
        if (!$clearIcon.is(':hidden')) {
          $clearIcon.hide().siblings('.icon-arrowdown[data-role="arrow"]').show();
        }
      }
    };

    select.version = '1.0.0';

    select.getValue = function () {
      return core.valueHooks.get();
    };

    select.setValue = function (value) {
      core.valueHooks.set(value);
    };

    select.reset = function () {
      core.reset();
    };

    core.init();
  };

  $.fn.select = function (options) {
    var args = toArray(arguments, 1);
    var options = options || {};
    var $self = this;
    var result;

    $self.each(function () {
      var data = $(this).data(NAME_SPACE);
      var fn;
      if (!data) {
        if (/destroy/.test(options)) {
          return false;
        }
        if (!isString(options)) return $(this).data(NAME_SPACE, data = new Select($(this), options));
      }

      if (data && isString(options) && $.isFunction(fn = data[options])) {
        result = fn.apply(data, args);
      }
    });
    return typeof result === 'undefined' ? $self : result;
  };

  $.fn.select.constructor = Select;

  function toArray (obj, offset) {
    var args = [];
    if (Array.from) {
      return Array.from(obj).slice(offset || 0);
    }
    if (typeof offset === 'number' && !isNaN(offset)) {
      args.push(offset);
    }
    return args.slice.apply(obj, args);
  }

  function isArray (arr) {
    return typeof arr === 'object' && arr instanceof Array;
  }

  Array.prototype.indexOf = function (searchElement, fromIndex) {
    var index = -1;
    fromIndex = fromIndex * 1 || 0;

    for (var k = 0, length = this.length; k < length; k++) {
      if (k >= fromIndex && this[k] === searchElement) {
        index = k;
        break;
      }
    }
    return index;
  };

  function isString (str) {
    return typeof str === 'string';
  }

  function isNumber (num) {
    return typeof num === 'number' && !isNaN(num);
  }

  function isBoolean (bln) {
    return typeof bln === 'boolean';
  }

  function animation ($target, classes, fn) {
    $target.removeClass(classes).addClass(classes).one(EVENT_NAMES_ANIMATION, once(function(e){
      $target.removeClass(classes);
      fn.apply($target, toArray(arguments));
    }));
    if (isIE) {
      $target.removeClass(classes);
      fn.apply($target, toArray(arguments));
    }
  }

  function once (fn) {
    var called = false;
    return function () {
      var that = this;
      var args = toArray(arguments);
      if (!called) {
        called = true;
        fn.apply(that, args);
      }
    }
  }
}, window.jQuery);
