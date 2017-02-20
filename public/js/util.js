
window.Util = (function () {
  var module = {}

// Some shims

  window.URL = window.URL || window.webkitURL

  navigator.getUserMedia = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia

  window.requestAnimationFrame = window.requestAnimationFrame ||
                               window.webkitRequestAnimationFrame ||
                               window.mozRequestAnimationFrame ||
                               window.msRequestAnimationFrame ||
                               window.oRequestAnimationFrame

  window.requestFullscreen = function (element) {
    var rfs = element.requestFullscreen ||
            element.webkitRequestFullScreen ||
            element.mozRequestFullScreen ||
            element.msRequestFullscreen
    rfs.call(element)
  }

// Gets both a screen stream and webcam stream
  module.captureUserMedia = function (callback, onlyAudio) {
    var screenShare = function (webcamStream) {
      window.getScreenId(function (er, sourceId, screenConstraints) {
        navigator.getUserMedia(screenConstraints, function (screenStream) {
          callback([screenStream, webcamStream])
        }, function (er) {
          console.error(er)
          if (window.location.protocol !== 'https:') {
            window.alert('Screen share requires secure origins.')
          } else {
            window.alert('Screen capture is not supported. Please upgrade your browser or install the required plugin.')
          }

          callback([null, webcamStream])
        })
      }, function (er) {
        console.error(er)
        callback([null, webcamStream])
      })
    }
    try {
      onlyAudio = module.getParameterByName('novideo') || module.getParameterByName('onlyaudio')
      navigator.getUserMedia({audio: true, video: !onlyAudio},
            function (webcamStream) {
              screenShare(webcamStream)
            }, function (er) {
              screenShare(null)
            })
    } catch (er) {
      screenShare(null)
    }
  }

  module.getParameterByName = function (name, url) {
    if (!url) {
      url = window.location.href
    }
    name = name.replace(/[[\]]/g, '\\$&')
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
    var results = regex.exec(url)
    if (!results) {
      return null
    } else if (!results[2]) {
      return ''
    }
    return decodeURIComponent(results[2].replace(/\+/g, ' '))
  }

  module.FormattedTime = (function () {
    var module = {}
    module.now = function () {
      var d = new Date()
      return ((d.getHours() % 12) || 12) + ':' + ('0' + d.getMinutes()).slice(-2)
    }

    return module
  }())

  module.makeAjaxCall = function (method, url, successCallback, errorCallback) {
    var xhr = new window.XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.onreadystatechange = function (e) {
      if (this.readyState === 4) {
        if (this.status >= 200 && this.status < 400) {
          if (successCallback && successCallback.constructor === Function) {
            return successCallback(this.responseText)
          }
        } else {
          if (errorCallback && errorCallback.constructor === Function) {
            return errorCallback(this.statusText)
          } else {
            console.error("Failed to get resource '" + url + "' Error: " + this.statusText)
          }
        }
      }
    }
    xhr.onerror = function (e) {
      if (errorCallback && errorCallback.constructor === Function) {
        return errorCallback(this.statusText)
      } else {
        console.error('Failed to get resource. Error: ' + this.statusText)
      }
    }
    xhr.send(null)
  }

  return module
}())
