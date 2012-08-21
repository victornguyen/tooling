/*
    
    Mazda Media Gallery 2011

    The Media Gallery is driven entirely by hash change handling:
    http://www.mazda.com.au/Community/Media-Gallery?req=latest#images
    http://www.mazda.com.au/Community/Media-Gallery?req=latest#video/cx-5-prototype/23bd452fds

    All behaviour is dictated by contents of the hash, parsed by Mazda.Media.getStateObj(),
    and routed through Mazda.Media.controller()

    The Media Gallery is made up of the following components:

    Mazda.Media.app         Main application logic
    Mazda.Media.modal       Modal logic. Has methods for 
    Mazda.MediaList         MediaList class. A list is a collection of MediaThumbs and can be of type 'video' or 'image'.
    Mazda.MediaThumb        MediaThumb class. 

*/

var Mazda = Mazda || {};

(function ($, window, document, undefined) {
    
    Mazda.Media = {};

    /*
    Media Gallery App
    The logic yo. All functionality reacts to window.location.hash changes and behaviour is routed through
    and controlled by Mazda.Media.controller()
    */
    Mazda.Media.app = {
        types: {
            video: {
                selector: '#media-gallery-list-video',
                tab: '#btn-media-video',
                list: null,
				emptyMessage: 'Sorry! There are no videos available.'
            },
            image: {
                selector: '#media-gallery-list-image',
                tab: '#btn-media-image',
                list: null,
				emptyMessage: 'Sorry! There are no images available.'
            }
        },

        init: function () {
            if ( !($(this.types.video.selector).length || $(this.types.image.selector).length) ) return;

            // init dropdown
            this._initDropDown();
            this._initMediaLists();

            // bind and trigger hashchange event
            $(window)
                .hashchange($.proxy(this.controller, this))
                .hashchange();
        },

        // everything gets routed through this...
        controller: function () {
            // console.log(this.getCurrentType(), this.getCurrentMediaGuid());

            // show media list
            this.showMediaList(this.getCurrentType() || 'video');

            // display media if there's a media guid in hash, otherwise close modal
            if (this.getCurrentMediaGuid())
                this.displayMedia();
            else
                Mazda.Media.modal.close();
        },

        showMediaList: function (type) {
            type = this.types[type] ? type : 'video'; // default to video if non-standard type
            $('div.media-gallery-list').hide();
            $('#media-list-select a.active').removeClass('active');
            $(this.types[type].selector).show();
            $(this.types[type].tab).addClass('active');
        },

        // parses window.location.hash into a nice object
        // e.g. #/image/all-new-bt-50-boss-sports-pack/93429E062A254E65A9789728B2B9A224
        getStateObj: function () {
            var hash = window.location.hash;
            if (!hash) return false;
            var stateArray = hash.replace('#/', '').split('/');
            return {
                type: stateArray[0] || null,
                slug: stateArray[1] || null,
                guid: (stateArray[2] ? stateArray[2].split('?')[0].split('&')[0] : null)
            };
        },

        resetState: function () {
            var type = this.getCurrentType() || 'video';
            window.location.hash = '#/' + type;
        },

        getCurrentType: function () {
            return this.getStateObj().type;
        },

        getCurrentMediaGuid: function () {
            return this.getStateObj().guid;
        },

        displayMedia: function () {
            var guid = this.getCurrentMediaGuid();
            list = this.types[this.getCurrentType()].list;

            !Mazda.Media.modal.isActive() && Mazda.Media.modal.display();
            Mazda.Media.modal.goToMedia(guid, list);
        },

        _initDropDown: function () {
            $('#trigger-media-chan').bind({
                // fix jumpy menu in firefox when fast hovering
                // http://stackoverflow.com/questions/3713513/jquery-dropdown-menu-using-slideup-and-slidedown-on-hover-is-jumpy

                mouseenter: function () {
                    clearTimeout($.data(this, 'timer'));
                    $(this)
                        .find('#channels-wrapper').stop(true, true).slideDown(80).end()
                        .find('a.btn').addClass('hover').end();

                },
                mouseleave: function () {
                    $.data(this, 'timer', setTimeout($.proxy(function() {
                        $(this)
                            .find('#channels-wrapper').stop(true, true).slideUp(50).end()
                            .find('a.btn').removeClass('hover').end();
                    }, this), 80));
                }
            });
        },

        _initMediaLists: function () {
            var types = this.types,
                $list;
            for (type in types) {
				$list = $(types[type].selector);
                types[type].list = new Mazda.MediaList($list[0], { type:type });
				// show error message if list is empty
				if ( !types[type].list.getThumbCount() ) {
					$list.append('<p>'+ types[type].emptyMessage +'</p>')
				}
            }
        }

    };



    /*
    Media Modal
    Modal stuff yo... ported from CRIC
    */
    Mazda.Media.modal = {
        initialised: false,
        active: false,
        type: null,       // 'video' or 'image'
        list: null,
        $player: null,
        config: {
            html: '#media-gallery-modal',
            imgParams: '?w=766&h=431&bc=black&as=1',
            blurbLength: 230,
			titleLength: 60,
            fbHtml: '<iframe src="//www.facebook.com/plugins/like.php?href={url}&amp;send=false&amp;layout=standard&amp;width=450&amp;show_faces=false&amp;action=like&amp;colorscheme=light&amp;font=arial&amp;height=35&amp;appId=196873297005200" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:450px; height:35px;" allowTransparency="true"></iframe>'
        },
        elems: {
            $target: '#media_modal_target',
            $info: '#media-modal-panel div.info',
			$panel: '#media-modal-panel',
            $index: '#media-modal-index',
            $count: '#media-modal-count',
            $prev: '#media-gallery-prev',
            $next: '#media-gallery-next',
            $like: '#media-modal-like'
        },
        infoMap: {
            title: '#media-modal-title',
            desc: '#media-modal-desc'
        },
        init: function () {
            for (key in this.elems)
                this.elems[key] = $(this.elems[key]);
	
			this.initNav();
            this.initialised = true;
            return true;
        },
        display: function (guid, list) {
            this.initialised || this.init();
            $.fancybox({
                padding: 0,
                margin: 0,
                titleShow: false,
                overlayOpacity: 0.5,
                overlayColor: '#000',
                href: this.config.html,
				autoScale: false,
                onStart: $.proxy(this._show, this),
                onCleanup: $.proxy(this.removeMedia, this),
                onClosed: $.proxy(this._hide, this)
            });
        },
        close: function () {
            $.fancybox.close();
        },
        reset: function () {

        },
        // TODO: do we need this anymore?
        setList: function (list) {
            if (list.getType() !== this.type) {
                this.type = list.getType();
                this.list = list;
                // do reset and list setting here...
            }
        },
        goToMedia: function (guid, list) {
            this.setList(list);
            // console.log('go to media', guid, list);
            var thumb       = list.getThumbByGuid(guid);
            this.updateInfo(thumb);
            this.createBlurb(thumb.getMediaInfo().desc);
			this.shortenTitle(thumb.getMediaInfo().title);
            this.updateNav(thumb, list);
            this.playMedia(thumb);
            this.trackEvent(thumb);
            // $.fancybox.resize();
        },
        isActive: function () {
            return this.active;
        },
        updateInfo: function (thumb) {
            var map = this.infoMap,
                info = thumb.getMediaInfo();

            for (key in map)
                $(map[key]).text(info[key]);

            // update facebook link.  it does not like unencoded hashbangs.
            this.elems.$like
                .find('iframe').remove().end()
                .append( this.config.fbHtml.replace('{url}',encodeURIComponent(window.location.href)) );
        },
        createBlurb: function (desc) {
            var maxLength = this.config.blurbLength,
                blurb;
            if (desc && desc.length > maxLength) {
                blurb = desc.substring(0, maxLength) + '... ';
                $(this.infoMap.desc)
                    .text(blurb)
                    .append('<a href="#">Read More</a>')
                    .find('a')
                        .click(function (e) {
                            e.preventDefault();
                            $(this).parent().html(desc);
                            $.fancybox.resize();
                        });
            }
        },
		shortenTitle: function(title) {
			var maxLength = this.config.titleLength;
            if (title && title.length > maxLength) {
                title = title.substring(0, maxLength) + '... ';
                $(this.infoMap.title).text(title);
            }
		},
        resetBlurb: function () {
            $('#media-modal-fulldesc').remove();
            $(this.infoMap.desc).empty().show();
        },
		initNav: function() {
			this.elems.$panel.delegate('a.no-hover', 'click', function(e){
				e.preventDefault();
			});

            if (navigator && navigator.platform && navigator.platform.match(/^(iPad|iPod|iPhone)$/)) {
                $("#media-gallery-modal").addClass("ios");
            }

		},
        updateNav: function (thumb, list) {
            var els = this.elems,
                nextThumb = list.getNextThumb(thumb),
                prevThumb = list.getPrevThumb(thumb);

            nextThumb ? els.$next.css('opacity',1).removeClass('no-hover').attr('href', nextThumb.getLink()) : els.$next.css('opacity',0.5).addClass('no-hover').attr('href','#');
            prevThumb ? els.$prev.css('opacity',1).removeClass('no-hover').attr('href', prevThumb.getLink()) : els.$prev.css('opacity',0.5).addClass('no-hover').attr('href','#');

            this.elems.$count.text(list.getThumbCount());
            this.elems.$index.text(list.getThumbIndex(thumb) + 1);
        },
        playMedia: function (thumb) {
            if (this.type === 'video')
                this.playVideo(thumb.getVideoId());
            else
                this.showImage(thumb.getImageUrl());
        },
        playVideo: function (movideoId) {
            if (this.$player) {
				// console.log('play! ', movideoId);
                this.$player.player('play', { mediaId: movideoId });
            }
            else {
                this.removeMedia();
				// console.log('embed and play!');
                this.$player = Mazda.Video.embedVideo(this.elems.$target, { mediaId:movideoId, autoPlay:true });
			}
        },
        removeMedia: function () {
            if (this.$player) {
				this.$player.unbind('playeridle');
				this.$player
					.empty()
					.removeData();
				this.$player = null;
			}
			this.elems.$target.empty();
        },
        showImage: function (src) {
            this.removeMedia();
            this.elems.$target
                .empty()
                .append('<img src="' + src + this.config.imgParams + '" alt="" />');
        },
        trackEvent: function(thumb) {
            // console.log('Media Gallery,', thumb.getMediaType()+',', thumb.getMediaInfo().title);
            _gaq && _gaq.push(['_trackEvent', 'Media Gallery', thumb.getMediaType(), thumb.getMediaInfo().title]);
            // console.log('Media Gallery Stats,', thumb.getMediaType()+'-stats'+',', thumb.getGuid());
            _gaq && _gaq.push(['_trackEvent', 'Media Gallery Stats', thumb.getMediaType() + '-stats', thumb.getGuid()]);
        },
        _show: function () {
            $(this.config.html).show();
            this.active = true;
        },
        _hide: function () {
            $(this.config.html).hide();
            Mazda.Media.app.resetState();
            this.active = false;
        }
    };



    /*
    Media Thumb (Constructor)
    Adds getter methods to easily access media info from media thumbs.
    */
    Mazda.MediaThumb = (function () {
        var Constructor = function (elem, options) {
            this.elem = elem;
            this.$elem = $(elem);
            this.config = $.extend({}, this.defaults, options || {});
            this._init();
        };
        Constructor.prototype = {
            defaults: {
                type: 'video',    // or 'image'
                title: 'span.media-title',
                desc: 'span.media-description',
                videoId: null,     // override
                imageUrl: null,      // override
				titleLength: 40
            },
            getMediaInfo: function () {
                return this.info;
            },
            getVideoId: function () {
                return this.config.videoId || this.$elem.find('a').first().attr('rel') || false;
            },
            getImageUrl: function () {
                return this.config.imageUrl || this.$elem.find('img.thumb').attr('src').split('?')[0] || false;
            },
            getLink: function () {
                return this.$elem.find('a').first().attr('href');
            },
            getGuid: function () {
                return this.$elem.find('a').first().attr('href').replace('#/', '').split('/')[2];
            },
            getMediaType: function () {
                return this.$elem.hasClass('video') ? 'video' : 'image';
            },
            _setMediaInfo: function () {
                var map = this.config,
                    ignore = ['videoId', 'imageUrl'], // keys from config to not attempt to use to scrape data from thumb html
                    isIgnored;
                this.info = {};
                for (key in map) {
                    isIgnored = $.inArray(key, ignore) > -1;
                    if (isIgnored) continue;
                    this.info[key] = this.$elem.find(map[key]).text();
                }
            },
			_truncateTitle: function() {
				var title = this.getMediaInfo().title;
				if ( title.length <= 30 ) return;
				this.$elem.find( this.config.title ).text( title.substring(0,this.config.titleLength) + '...' );
			},
            _init: function () {
                this._setMediaInfo();
				this._truncateTitle();
            }
        };
        return Constructor;
    })();



    /*
    Media List (Constructor)
    A collection of MediaThumbs with helper methods
    */
    Mazda.MediaList = (function () {
        var Constructor = function (elem, options) {
            this.elem = elem;
            this.$elem = $(elem);
            this.$thumbs = null,
            this.mediaThumbs = [],
            this.config = $.extend({}, this.defaults, options || {});
            this._init();
        };
        Constructor.prototype = {
            defaults: {
                type: 'video',    // or 'image'
                thumbClass: 'li.media-gallery-thumb'
            },
            getThumbs: function () {
                return this.mediaThumbs;
            },
            getType: function () {
                return this.config.type;
            },
            getThumbByGuid: function (guid) {
                var thumbs = this.mediaThumbs,
                    i = thumbs.length,
                    match = null;
                while (i--) {
                    if (thumbs[i].getGuid() == guid) {
                        match = thumbs[i];
                        break;
                    }
                }
                return match;
            },
            getThumbIndex: function (thumb) {
                var thumbs = this.mediaThumbs,
                    i = thumbs.length;
                while (i--) {
                    if (thumbs[i].getGuid() === thumb.getGuid()) {
                        return i;
                    }
                }
                return 0;
            },
            getThumbCount: function () {
                return this.mediaThumbs.length;
            },
            getNextThumb: function (thumb) {
                return this.mediaThumbs[this.getThumbIndex(thumb) + 1] || false;
            },
            getPrevThumb: function (thumb) {
                return this.mediaThumbs[this.getThumbIndex(thumb) - 1] || false;
            },
            _init: function () {
                this.$thumbs = this.$elem.find(this.config.thumbClass);

                var type = this.config.type,
                    collection = this.mediaThumbs;

                this.$thumbs.each(function () {
                    var thumb = $.data(this, 'thumb') || new Mazda.MediaThumb(this, { type: type });
                    $.data(this, 'thumb', thumb);
                    collection.push(thumb);
                });
            }
        };
        return Constructor;
    })();



    // dom ready
    $(function () {
        Mazda.Media.app.init();
    });

})(jQuery, window, document);