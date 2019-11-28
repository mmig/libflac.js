$(function () {
    // Search Items
    $('#search').on('keyup', function (e) {
        var value = $(this).val();
        var $el = $('.navigation');

        if (value) {
            var regexp = new RegExp(value, 'i');
            $el.find('li, .itemMembers').hide();

            $el.find('li').each(function (i, v) {
                var $item = $(v);

                if ($item.data('name') && regexp.test($item.data('name'))) {
                    $item.show();
                    $item.closest('.itemMembers').show();
                    $item.closest('.item').show();
                }
            });
        } else {
            $el.find('.itemMembers').hide();
            $el.find('.item').show();
            showPageItem();
        }

        $el.find('.list').scrollTop(0);
    });

    // Toggle when click an item element
    $('.navigation').on('click', '.title', function (e) {
        $(this).parent().find('.itemMembers').toggle();
    });

    // Make the item related a current documentation visible
    // param item: if specified, show this item & its .itemMembers,
    //             otherwise revert default visibility for page item
    //             i.e. show item & its itemMembers & all its members list-entries
    //             (i.e. all its <li> elements)
    var showPageItem = function(item){

      var $currentItem = item, showAllMembers = false;
      if(!item){
        var filename = $('.page-title').data('filename').replace(/\.[a-z]+$/, '');
        $currentItem = $('.navigation .item[data-name*="' + filename + '"]:eq(0)');
        showAllMembers = true;
      }

      if ($currentItem.length) {
          $currentItem
              .show()
              .find('.itemMembers').show();

          if(showAllMembers){
            $currentItem.find('li').show();
          }
      }
    }

    // Show an item related a current documentation automatically
    var filename = $('.page-title').data('filename').replace(/\.[a-z]+$/, '');
    var $currentItem = $('.navigation .item[data-name*="' + filename + '"]:eq(0)');

    if ($currentItem.length) {
        $currentItem
            .remove()
            .prependTo('.navigation .list');

        showPageItem($currentItem);
    }

    // Auto resizing on navigation
    var _onResize = function () {
        var height = $(window).height();
        var $el = $('.navigation');

        $el.height(height).find('.list').height(height - 133);
    };

    $(window).on('resize', _onResize);
    _onResize();

    // disqus code
    if (config.disqus) {
        $(window).on('load', function () {
            var disqus_shortname = config.disqus; // required: replace example with your forum shortname
            var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
            dsq.src = 'http://' + disqus_shortname + '.disqus.com/embed.js';
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
            var s = document.createElement('script'); s.async = true;
            s.type = 'text/javascript';
            s.src = 'http://' + disqus_shortname + '.disqus.com/count.js';
            document.getElementsByTagName('BODY')[0].appendChild(s);
        });
    }
});
