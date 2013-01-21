/*
* Redditate
* Copyright 2011, Dave Gamache
* www.redditate.com
* Free to use under the MIT license.
* http://www.opensource.org/licenses/mit-license.php
* 10/01/2011
*/

$(document).ready(function() {


  //Global Vars -----------------------------------------------------

  var posts = $('#posts'),
  afterString,
  subdomain = readParams('r'),
  loader = $('.wash'),
  loadMore = $('.loadmore-button'),
  activePost = 0,
  post,
  subredditHint = $('.subreddit-hint p'),
  hintIndex = 0,
  lock = false,
  commandDown = false,
  subredditShortcutJustLaunched = false,

  infiniteScrollThreshold = 375,
  permalinkScrollThreshold = 100,
  earlierPostsPossible = false,
  laterPostsPossible = true,
  lastPermalinkPosition = $(document).scrollTop(),
  shouldCheckScroll = false,
  shouldScrollDown,

  didScroll,
  direction = "after",
  postName,
  postNameUnsliced,


  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };



//Initial Load -------------------------------------------------------------------------------

  
  function redditTimline() {
    var params,
        dataUrl;

    params = getUrlVars();
    dataUrl = $('.main').data('url');

    // console.log(dataUrl);

    shouldCheckScroll = false;

    lastPermalinkPosition = $(document).scrollTop();

    $(window).scroll(__bind(function() {
      return shouldCheckScroll = true;
    }, this));

    every(250, __bind(function() {
      return didScroll();
    }, this));

    shouldScrollDown = false;
    
    if (params.after) {

      postNameUnsliced = params.after;
      postName = postNameUnsliced.slice(0, -1);

      console.log(postName);      

      shouldScrollDown = true;
      earlierPostsPossible = true;
    }

    // If viewType cookied, set it
    if($.cookie("viewType")) {
      $('body')
        .removeClass('fullview')
        .removeClass('listview')
        .addClass($.cookie("viewType"));
    }

    loadJSON(direction,postName);

  }

  redditTimline();

  //JSON -------------------------------------------------------------------------------

  // Load data
  function loadJSON(direction,postName) {

    lock = true;

    query = "http://www.reddit.com/"+subdomain+".json?limit=25&" + direction + "=" + postName + "&jsonp=?";

    console.log(query);
    
    
    $.getJSON(query, null, function(data) {

      renderPost(data.data.children);

      // afterString = post.data.name;
      // console.log(afterString);

    }).complete(function() {
      post = $('.post');
      console.log(post);
      
      classifyImages();
      loader.fadeOut(100);
      loadMore.removeClass('loading');
      lock = false;

      $lastPost = $('.main .post:last-child');
      
    });
  }

  function permalink(dataPost) {
    if (!window.history || !window.history.pushState) {
      return;
    }

    urlPath = window.location.pathname;

    if (dataPost) {
      urlPath += "?after=" + dataPost.data('name');
    }
    return window.history.replaceState({}, document.title, urlPath);
  }

  // So we've scrolled down the page, do we need to load more posts? This
  // analyzes what posts are visible and figures out if we need to load more
  // posts (either earlier ones or later ones).
  // 
  // Returns nothing.

  function didScroll() {
    var bottomOfLastPost,
    scrolledDownEnough,
    scrolledUpEnough,
    topOfFirstPost,
    dataUrl,
    visibleBottom,
    _i,
    _len,
    _ref,
    _results;

    // Load more JSON from scroll
    // if ($(window).scrollTop() >= $(document).height() - $(window).height() - 10){
    //   if (!(navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/iPad/i))) {
    //     if(lock == false) {
          
    //       loadJSON();
    //       updateUrl();
    //     }
    //   }

    // }

    //Control activePost value based on scroll position
    // if($(document).scrollTop() > (post.eq(activePost).offset().top-90)) {
    //   activePost++
    // }
    // if($(document).scrollTop() < (post.eq(activePost-1).offset().top-90)) {
    //   if(activePost-1 > 0) {
    //     activePost--
    //   }
    // }
    // console.log("activePost: "+activePost+", documentScrollTop: "+$(document).scrollTop()+", activePost offset top: "+(post.eq(activePost).offset().top-90));

    if (!shouldCheckScroll) {
      return;
    }

    // bottom of the page
    visibleBottom = $(document).scrollTop() + $(window).height();

    topOfFirstPost = $('.main').find('.post:first-child').offset().top;

    bottomOfLastPost = $lastPost.outerHeight() + $lastPost.offset().top;


    // If later posts are available fetch new data
    if (!lock && laterPostsPossible && ((bottomOfLastPost - visibleBottom < infiniteScrollThreshold))) {

      loader.fadeIn(100);

      postName = $lastPost.data('name');
      direction = "after";
      loadJSON(direction,postName);
    }

    // If earlier posts are available fetch new data
    if (!lock && earlierPostsPossible && (topOfFirstPost >= $(document).scrollTop())) {

      loader.fadeIn(100);

      direction = "before";
      postName = $('.main').find('.post:first-child').data('name');
      loadJSON(direction,postName);

    }

    scrolledDownEnough = $(document).scrollTop() > (lastPermalinkPosition + permalinkScrollThreshold);
    scrolledUpEnough = $(document).scrollTop() < (lastPermalinkPosition + permalinkScrollThreshold);
    

    if (scrolledDownEnough || scrolledUpEnough) {
      lastPermalinkPosition = $(document).scrollTop();

      _ref = $('.main').find('.post');

      _results = [];

      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        dataPost = _ref[_i];
        dataPost = $(dataPost);

        if (dataPost.offset().top >= (lastPermalinkPosition - infiniteScrollThreshold)) {
          if (dataPost.is(':first-child') && !earlierPostsPossible) {

            console.log(earlierPostsPossible);
            
            permalink(false);
          } else {
            permalink(dataPost);
          }
          break;
        }
      }
      return _results;
    }

  }

  // Load more JSON from click (tablet/mobile)
  $('.loadmore-button').click(function() {
    if(lock === false) {
      loadMore.addClass('loading');
      loadJSON();
    }
  });

  //Rendering -------------------------------------------------------------------------------

  // Render Post with Handlebars
  function renderPost(postData) {

    var context,
        created_at,
        rendered,
        scrollOffset,
        templateSource,
        postTemplate,
        postHTML,
        $wrapper = $('.main');
    

    if (direction === "after") {

      $.each(postData, function(i, post) {

        templateSource = $("#postTemplate").html();
        postTemplate = Handlebars.compile(templateSource);
        postHTML = postTemplate(post.data);

        posts.append(postHTML);
          
      });
      
    } else {

      // Can we get earlier tweets (true/false)
      earlierTweetsPossible = postData.length > 0;

      // If we're prepending posts, we want to reverse the order
      postData = postData.reverse();

      

      $.each(postData, function(i, post) {

        postTemplate = Handlebars.compile(templateSource);
        postHTML = postTemplate(post.data);

        posts.prepend(postHTML);
          
      });

      scrollOffset = $(window).scrollTop() + firstPost.offset().top;
      scrollOffset -= $('.main').find('.post:first-child').offset().top;

      $(window).scrollTop(scrollOffset);

      
    }
    
  }

  //Create readable title from ?r= subdomain value
  if (!subdomain === "") {
    var readableSubdomain = subdomain.replace("r/", "");
    $('.logo .subreddit .title').text(readableSubdomain);
    document.title = "Redditate: "+readableSubdomain;
  }


  // Template Helpers -------------------------------------------------------------------------------

  // IMAGE: Rendering fullsize images
  Handlebars.registerHelper('hasImage', function(url, fn) {
    var isImgur = (/imgur*/).test(url);
    // Fix broken imgur links
    if(isImgur) {
      if(isImage(url)) {
        // do nothing
      } else {
        url += ".jpg"
      }
    } else {
      var isQuickMeme = (/(?:qkme\.me|quickmeme\.com\/meme)\/(\w*)/).exec(url);
      if (isQuickMeme !== null) {
        url = "http://i.qkme.me/" + isQuickMeme[1] + ".jpg";
      }
    }
    if(isImage(url)) {
      return '<a class="image-embed"><img src="'+url+'" alt="" /></a>';
    } else {
      return false;
    }
  });

  // YOUTUBE: If embedded video is real, render it
  Handlebars.registerHelper('hasYoutube', function(url, fn) {
    if(isYoutube(url)) {
      youtubeID = url.replace(/^[^v]+v.(.{11}).*/,"$1");
      youtubeLinkTime = url.split("#");
      youtubeLinkTime = youtubeLinkTime[1];
      return '<iframe width="420" height="345" src="http://www.youtube.com/embed/'+youtubeID+'?wmode=transparent&#'+youtubeLinkTime+'" frameborder="0" wmode="Opaque" allowfullscreen></iframe>';
    } else {
      return false;
    }
  });

  // LISTVIEW THUMBNAIL: If thumb is real, render it
  Handlebars.registerHelper('hasThumbnail', function(thumbnail, url, fn) {
    if(thumbnail != "") {
      return '<a class="thumbnail-embed" href="'+url+'" target="_blank"><img src="'+thumbnail+'" alt="" /></a>';
    } else {
      return false;
    }
  });


  //Interactions -------------------------------------------------------------------------------

  // Image fullsize on click
  $('.post .image-embed').live('click', function(e) {
    e.preventDefault();
    resizeImage($(this));
  });

  // Toggling grid/list/full view
  $('.view-options a').click(function(e) {
    e.preventDefault();
    setupViewtype($(this));
  });

  // Open Subreddit Picker
  $('.subreddit').click(function(e) {
    e.preventDefault();
    openSubredditPicker();
  });
  $('.subreddit-close-button').click(function(e) {
    e.preventDefault();
    closeSubredditPicker();
  });
  $('.subreddit-heading').click(function(e) {
    e.preventDefault();
    closeSubredditPicker();
  });

  //Cycling hints
  subredditHint.eq(hintIndex).show();
  $('.down-carrot-wrapper').click(function() {
    subredditHint.hide();
    if(hintIndex < subredditHint.length-1) {
      hintIndex++
      subredditHint.eq(hintIndex).show();
    } else {
      hintIndex = 0;
      subredditHint.eq(hintIndex).show();
    }
  })

  // Keyboard interactions
  document.onkeydown = function(evt) {
    evt = evt || window.event;
    // Esc close of subreddit picker
    if(commandDown == false) {
      if (evt.keyCode == 27) {
        closeSubredditPicker();
        $('.subreddit-shortcut').removeClass('visible');
        $('.subreddit-input input').removeClass('visible')
      }
      // Command key fix
      if (evt.keyCode == 91) {
        commandDown = true;
      }
      if (!$('.subreddit-shortcut').hasClass('visible')) {
        // "J" goes to next post
        if (evt.keyCode == 74) {
          if(activePost == post.length-1) {
            $("html, body").attr({ scrollTop: $(document).height() });
          } else {
            var postScrollOffset = post.eq(activePost).offset();
            window.scrollTo(postScrollOffset.left, postScrollOffset.top - $('nav').height() - 10)
          }
        }
        // "K" goes to prev post
        if (evt.keyCode == 75) {
          if(activePost > 1) {
            var postScrollOffset = post.eq(activePost-2).offset();
            window.scrollTo(postScrollOffset.left, postScrollOffset.top - $('nav').height() - 10)
          }
        }
        // "F" changes to fullview
        if (evt.keyCode == 70) {
          setupViewtype($('a.fullview'));
        }
        // "L" changes to listview
        if (evt.keyCode == 76) {
          setupViewtype($('a.listview'));
        }
        // "Z" zooms on image in post if there is one
        if (evt.keyCode == 90) {
          resizeImage(post.eq(activePost-1).find('.image-embed'));
        }
        // "C" zooms on image in post if there is one
        if (evt.keyCode == 67) {
          var permalink = post.eq(activePost-1).find('.permalink').attr('href')
          window.open(permalink,'_newtab');
        }
        // "R" launches the subreddit prompt
        if (evt.keyCode == 82) {
          $('.subreddit-shortcut').addClass('visible')
          subredditShortcutJustLaunched = true;
        }
        // Enter opens to current post
        if (evt.keyCode == 13) {
          var postLink = post.eq(activePost-1).find('.post-title').attr('href');
          window.open(postLink,'_newtab');
        }
      }
    }
  };

  document.onkeyup = function(evt) {
    evt = evt || window.event;
    // Esc close of subreddit picker
    if (evt.keyCode == 91) {
      commandDown = false;
    }
    if (evt.keyCode == 82) {
      if(subredditShortcutJustLaunched) {
        $('.subreddit-input input')
          .val("")
          .addClass('visible')
          .focus();
        subredditShortcutJustLaunched = false;
      }
    }
  }

  $(window).blur(function() {
    commandDown = false;
  })

 $('.subreddit-input input').keydown(function(e){
  if(e.keyCode == 13) {
    e.preventDefault();
    window.location.href = "http://www." + window.location.hostname + "/?r=r/" + $('.subreddit-input input').val();
  }
});


  //Utility Functions -------------------------------------------------------------------------------

  // Read URL to get params
  function readParams(name) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
      return "";
    else
      return results[1];
  }

  //Determine is this is an image
  function isImage(str){
    var result = (/\.(?=gif|jpg|png)/gi).test(str);
    if (result) {
      return true;
    } else {
      return false;
    }
  }

  //Determine is this is a youtube video
  function isYoutube(str){
    var urlResult = str.indexOf('youtube');
    // Doesn't link to youtubes that aren't videos
    var videoResult = str.indexOf('watch');
    if (urlResult != -1 && videoResult != -1) {
      return true;
    } else {
      return false;
    }
  }

  function classifyImages() {
    $('img').not('already-classified').imagesLoaded(function() {
      $(this).each(function() {
      $(this).addClass('already-classified');
        if($(this).width() == 880) {
          $(this).addClass('not-resizeable')
        } else if($(this).width() != 880 && $(this).height() != 501) {
          $(this).addClass('not-resizeable')
        }
      })
    });
  }

  // Resize fullview inlined image
  function resizeImage(clickTarget) {
    if(clickTarget.children('img').hasClass('fullwidth')) {
      // Determine if image is above offscreen and if so, make it at top of shrink
      var postParentPosition = clickTarget.children('img').offset();
      if(postParentPosition.top < $(window).scrollTop()) {
        window.scrollTo(postParentPosition.left, (postParentPosition.top - $('nav').height() - 10));
      }
    }
    // Toggle fullwidth class
    clickTarget.children('img').toggleClass('fullwidth');
  }

  //Set and cookie the viewType (fullview/listview)
  function setupViewtype(viewClick) {
    var activeClass = viewClick.data('viewType');
    $('body')
      .removeClass('listview')
      .removeClass('fullview')
      .addClass(activeClass);
    if(activePost != 0) {
      window.scrollTo(0,post.eq(activePost-1).offset().top);
    } else {
      window.scrollTo(0,0);
    }
    $.cookie("viewType", null);
    $.cookie("viewType", activeClass, { expires: 100 });
  }

  // Open picker
  function openSubredditPicker() {
    $('body').addClass('subreddit-picker-open');
    $('.subreddit-picker').slideDown(250);
  }

  // Close picker
  function closeSubredditPicker() {
    $('body').removeClass('subreddit-picker-open');
    $('.subreddit-picker').slideUp(250);
  }

  //Spinner -------------------------------------------------------------------------------
  var optsWash = {
    width: 2 // The line thickness
  },
  optsButton = {
    width: 2, // The line thickness
    radius: 6,
    length: 4
  },
  targetWash = document.getElementById('loading'),
  targetButton = document.getElementById('spinner'),
  spinnerWash = new Spinner(optsWash).spin(targetWash),
  spinnerButton = new Spinner(optsButton).spin(targetButton);

});
