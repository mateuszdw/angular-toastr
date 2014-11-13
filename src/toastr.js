angular.module('toastr', [])
  .directive('toast', ['$compile', '$timeout', 'toastr', function($compile, $timeout, toastr) {
    return {
      replace: true,
      templateUrl: 'templates/toastr/toastr.html',
      link: function(scope, element, attrs) {
        var timeout;

        scope.toastClass = scope.options.toastClass;
        scope.titleClass = scope.options.titleClass;
        scope.messageClass = scope.options.messageClass;

        if (scope.options.closeHtml) {
          var button = angular.element(scope.options.closeHtml);
          button.addClass('toast-close-button');
          button.attr('ng-click', 'close()');
          $compile(button)(scope);
          element.prepend(button);
        }

        scope.init = function() {
          if (scope.options.timeOut) {
            timeout = createTimeout(scope.options.timeOut);
          }
        };

        element.on('mouseenter', function() {
          if (timeout) {
            $timeout.cancel(timeout);
          }
        });

        scope.tapToast = function () {
          if (scope.options.tapToDismiss) {
            scope.close();
          }
        };

        scope.close = function () {
          toastr.remove(scope.toastId);
        };

        element.on('mouseleave', function() {
          if (scope.options.timeOut === 0 || scope.options.extendedTimeOut === 0) {return;}
          timeout = createTimeout(scope.options.extendedTimeOut);
        });

        function createTimeout(time) {
          return $timeout(function() {
            toastr.remove(scope.toastId);
          }, time);
        }
      }
    };
  }])

  .constant('toastrConfig', {
    allowHtml: false,
    closeButton: false,
    closeHtml: '<button>&times;</button>',
    containerId: 'toast-container',
    extendedTimeOut: 1000,
    iconClasses: {
      error: 'toast-error',
      info: 'toast-info',
      success: 'toast-success',
      warning: 'toast-warning'
    },
    messageClass: 'toast-message',
    newestOnTop: true,
    positionClass: 'toast-top-right',
    tapToDismiss: true,
    timeOut: 5000,
    titleClass: 'toast-title',
    toastClass: 'toast',
    toastMaxQuantity: 1,
    appendToastTo: '#toastr-notifications',
    roomObject: null,
    userObject:null,
    showCountdown: false
  })

  .factory('toastr', ['$animate', '$compile', '$document', '$rootScope', '$sce', 'toastrConfig', '$q','$timeout', function($animate, $compile, $document, $rootScope, $sce, toastrConfig, $q,$timeout) {
    var container, index = 0, toasts = [];
    var containerDefer = $q.defer();
    var counterTimeout;

    var toastr = {
      clear: clear,
      error: error,
      info: info,
      remove: remove,
      success: success,
      warning: warning
    };

    return toastr;

    /* Public API */
    function clear(toast) {
      if (toast) {
        remove(toast.toastId);
      } else {
        for (var i = 0; i < toasts.length; i++) {
          remove(toasts[i].toastId);
        }
      }
    }

    function error(message, title, optionsOverride) {
      return _notify({
        iconClass: _getOptions().iconClasses.error,
        message: message,
        optionsOverride: optionsOverride,
        title: title
      });
    }

    function info(message, title, optionsOverride) {
      return _notify({
        iconClass: _getOptions().iconClasses.info,
        message: message,
        optionsOverride: optionsOverride,
        title: title
      });
    }

    function success(message, title, optionsOverride) {
      return _notify({
        iconClass: _getOptions().iconClasses.success,
        message: message,
        optionsOverride: optionsOverride,
        title: title
      });
    }

    function warning(message, title, optionsOverride) {
      return _notify({
        iconClass: _getOptions().iconClasses.warning,
        message: message,
        optionsOverride: optionsOverride,
        title: title
      });
    }

    /* Internal functions */
    function _getOptions() {
      return angular.extend({}, toastrConfig);
    }

    function _setContainer(options) {
      if(container) { return containerDefer.promise; } // If the container is there, don't create it.

      container = angular.element('<div></div>');
      container.attr('id', options.containerId);
      container.addClass(options.positionClass);
      container.css({'pointer-events': 'auto'});
      appendTo = options.appendToastTo ? options.appendToastTo : 'body'
      var body = $document.find(appendTo).eq(0);
      $animate.enter(container, body).then(function() {
        containerDefer.resolve();
      });
      return containerDefer.promise;
    }

    function _notify(map) {
      var options = _getOptions();

      var newToast = {
        toastId: index++,
        scope: $rootScope.$new()
      };
      newToast.iconClass = map.iconClass;
      if (map.optionsOverride) {
        options = angular.extend(options, map.optionsOverride);
        newToast.iconClass = map.optionsOverride.iconClass || newToast.iconClass;
      }

      if(toasts.length >= options.toastMaxQuantity){
        var r = toasts[toasts.length-options.toastMaxQuantity]['toastId']
        remove(r)
      }

      createScope(newToast, map, options);

      newToast.el = createToast(newToast.scope);
      
      toasts.push(newToast);

      _setContainer(options).then(function() {
        if (options.newestOnTop) {
          $animate.enter(newToast.el, container).then(function() {
            newToast.scope.init();
          });
        } else {
          $animate.enter(newToast.el, container, container[0].lastChild).then(function() {
            newToast.scope.init();
          });
        }
      });

      return newToast;

      function createScope(toast, map, options) {
        if (options.allowHtml) {
          toast.scope.allowHtml = true;
          toast.scope.title = $sce.trustAsHtml(map.title);
          toast.scope.message = $sce.trustAsHtml(map.message);
        } else {
          toast.scope.title = map.title;
          toast.scope.message = map.message;
        }

        // custom objects pass through options
        if(options.roomObject)
            toast.scope.roomObject = options.roomObject
        if(options.userObject)
            toast.scope.userObject = options.userObject

        var onCounter = function(){
          toast.scope.counter--
          if(toast.scope.counter <= 0){
             $timeout.cancel(counterTimeout);
          } else {
            counterTimeout = $timeout(onCounter, 1000);
          }
        }

        // custom counter
        if(options.showCountdown)
            toast.scope.counter = (options.timeOut/1000)

        if (toast.scope.counter > 0){
            $timeout.cancel(counterTimeout);
            counterTimeout = $timeout(onCounter, 1000);
        }

        toast.scope.toastType = toast.iconClass;
        toast.scope.toastId = toast.toastId;

        toast.scope.options = {
          extendedTimeOut: options.extendedTimeOut,
          messageClass: options.messageClass,
          tapToDismiss: options.tapToDismiss,
          timeOut: options.timeOut,
          titleClass: options.titleClass,
          toastClass: options.toastClass
        };

        if (options.closeButton) {
          toast.scope.options.closeHtml = options.closeHtml;
        }
      }

      function createToast(scope) {
        var angularDomEl = angular.element('<div toast></div>');
        return $compile(angularDomEl)(scope);
      }
    }

    function remove(toastIndex) {
      var toast = findToast(toastIndex);
      
      if (toast) { // Avoid clicking when fading out
      
        $animate.leave(toast.el).then(function() {
          toast.scope.$destroy();
          if (container && container.children().length === 0) {
            toasts = [];
            container.remove();
            container = null;
            containerDefer = $q.defer();
          }
        });
      }

      function findToast(toastId) {
        for (var i = 0; i < toasts.length; i++) {
          if (toasts[i].toastId === toastId) {
            return toasts[i];
          }
        }
      }
    }
  }])
  .run(['$templateCache', function($templateCache) {
      'use strict';

      $templateCache.put('templates/toastr/toastr.html',
        "<div class=\"{{toastClass}} {{toastType}}\" ng-click=\"tapToast()\">\n" +
        "  <div ng-switch on=\"allowHtml\">\n" +
        "    <div ng-switch-default ng-if=\"title\" class=\"{{titleClass}}\">{{title}}</div>\n" +
        "    <div ng-switch-default class=\"{{messageClass}}\">{{message}}</div>\n" +
        "    <div ng-switch-when=\"true\" ng-if=\"title\" class=\"{{titleClass}}\" ng-bind-html=\"title\"></div>\n" +
        "    <div ng-switch-when=\"true\" class=\"{{messageClass}}\" ng-bind-html=\"message\"></div>\n" +
        "  </div>\n" +
        "  <div ng-if=\"userObject\" ng-include=\"user_label = userObject;'user_label.html'\"></div>\n" +
        "  <div ng-if=\"roomObject\" ng-include=\"room = roomObject;'room_label.html'\" ng-click=\"enterRoom(roomObject.id)\" class=\"room_l small\"></div>\n" +
        "  <div ng-if=\"counter\" class=\"count-down\">{{counter}}</div>" +
        "  <div ng-if=\"counter <= 0\" ng-init=\"enterRoom(roomObject.id)\">ENTER ROOM NOW!</div>" +
        "  <div ng-if=\"userObject\" ng-click=\"unFollowNow(userObject.id)\">click to stop follow</div>\n" +

        "</div>"
      );

   }]);

