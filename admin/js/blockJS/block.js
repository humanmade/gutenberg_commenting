import Board from './component/board';
import React from 'react'
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

const {__} = wp.i18n;                                                   // eslint-disable-line
const {Fragment, Component} = wp.element;                               // eslint-disable-line
const {toggleFormat} = wp.richText;                                     // eslint-disable-line
const {RichTextToolbarButton} = wp.blockEditor;                         // eslint-disable-line
const {registerFormatType, applyFormat, removeFormat} = wp.richText;    // eslint-disable-line
const $ = jQuery;                                                       // eslint-disable-line

// Window Load functions.
$( window ).on('load', function () {

    let loadAttempts = 0;
    const loadComments = setInterval(function () {
        loadAttempts++;
        if ( 1 <= $('.block-editor-writing-flow').length ) {
            // Clearing interval if found.
            clearInterval( loadComments );

            // Appending history popup on load.
            let customHistoryPopup = '<div id="custom-history-popup"><div id="comments-toggle"><a href="javascript:void(0)">Hide All Comments</a></div><div id="custom-history-popup-inner"></div>';
            customHistoryPopup = DOMPurify.sanitize( customHistoryPopup );
            $( '.edit-post-layout' ).append( customHistoryPopup ); // phpcs:ignore

            // Adjusting edit post header height
            var headerHeight = $('.edit-post-layout .edit-post-header').outerHeight();
            $('#custom-history-popup').css({top: headerHeight});

            // Managing comment boards for mobile view.
            // By default in mobile view borads will be hidden.
            var screenWidth = window.screen.width;
            if( 1200 > screenWidth ) {
                $( '#comments-toggle' ).trigger( 'click' );
            }

            // Fetching comments
            fetchComments();
        }

        // Clearing interval if not found in 10 attemps.
        if ( loadAttempts >= 10 ) {
            clearInterval( loadComments );
        }
    }, 1000);

    // Show setting button.
    showSettings();

    $(document).on('click', '.components-notice__action', function () {

        if ('View the autosave' === $(this).text()) {
            bring_back_comments();
        }
        if ('Restore the backup' === $(this).text()) {

            setTimeout(function () {
                // Sync popups with highlighted texts.
                $('.wp-block mdspan').each(function () {
                    var selectedText = $(this).attr('datatext');
                    if ($('#' + selectedText).length === 0) {
                        createBoard(selectedText, 'value', 'onChange');
                    }
                });

                bring_back_comments();
            }, 500);

        }

    });

});

// Add history button.
function showSettings() {

    if( 0 === $('#history-toggle').length ) {

        let commentingPluginUrl = localStorage.getItem("commentingPluginUrl");
        commentingPluginUrl = null === commentingPluginUrl ? 'https://www.multidots.com/google-doc-style-editorial-commenting-for-wordpress/wp-content/plugins/commenting-block/' : commentingPluginUrl;

        const customButtons = `<div class="components-dropdown custom-buttons"><span aria-expanded="false" class="components-button has-icon" aria-label="Tools" title="Editorial Comments Settings"><span id="history-toggle" data-count="0"><img src="${commentingPluginUrl}admin/images/commenting-logo.svg" width="18" alt="Comment Settings" /></span></button></div>`;

        let loadAttempts = 0;
        const loadIcons = setInterval(function () {
            loadAttempts++;

            if (loadAttempts >= 10 || (1 <= $('.edit-post-header-toolbar').length && 0 === $('#history-toggle').length)) {
                // Same condition used (#history-toggle.length) as WordPress wipes out it some times.
                if (0 === $('.edit-post-header-toolbar__left').length) {
                    $('.edit-post-header-toolbar').append(DOMPurify.sanitize( customButtons )); // phpcs:ignore
                } else {
                    $('.edit-post-header-toolbar .edit-post-header-toolbar__left').append(DOMPurify.sanitize( customButtons )); // phpcs:ignore
                }
            }

            // Stop checking after 3 attempts as WordPress is wiping
            // out these custom buttons in first few attempts.
            if (loadAttempts >= 3 && 1 === $('#history-toggle').length) {
                clearInterval(loadIcons);
            }
        }, 2000);
    }
}

function fetchComments() {
    var parentNode = document.createElement('div');
    parentNode.setAttribute("id", 'md-comments-suggestions-parent');

    var referenceNode = document.querySelector('.block-editor-writing-flow');
    if (null !== referenceNode) {
        referenceNode.appendChild(parentNode);

        var commentNode = document.createElement('div');
        commentNode.setAttribute("id", 'md-span-comments');
        commentNode.setAttribute("class", 'comments-loader');
        var parentNodeRef = document.getElementById('md-comments-suggestions-parent');
        parentNodeRef.appendChild(commentNode);

        let selectedText;
        var allThreads = [];

        // If no comment tag exist, remove the loader and temp style tag immediately.
        const span_count = $('.wp-block mdspan').length;
        if (0 === span_count) {
            $('#md-span-comments').removeClass('comments-loader');
            $('#loader_style').remove();
        } else {
            $('.wp-block mdspan').each(function () {
                selectedText = $(this).attr('datatext');

                if ($('#' + selectedText).length === 0) {

                    var newNode = document.createElement('div');
                    newNode.setAttribute("id", selectedText);
                    newNode.setAttribute("class", "cls-board-outer is_active");

                    var referenceNode = document.getElementById('md-span-comments');
                    referenceNode.appendChild(newNode);

                    ReactDOM.render(
                        <Board datatext={selectedText} onLoadFetch={1}/>,
                        document.getElementById(selectedText)
                    )
                }
                allThreads.push(selectedText);
            });

            let loadAttempts = 0;
            const loadComments = setInterval(function () {
                loadAttempts++;
                if (1 <= $('#md-span-comments .commentContainer').length) {
                    clearInterval(loadComments);
                    $('#loader_style').remove();
                    $('#md-span-comments').removeClass('comments-loader');
                    $('#history-toggle').attr('data-count', $('.cls-board-outer:visible').length);
                    showSettings(); // Another attempt if setting icon not displayed.
                }
                if (loadAttempts >= 10) {
                    clearInterval(loadComments);
                    $('#loader_style').remove();
                    $('#md-span-comments').removeClass('comments-loader');
                    showSettings(); // Another attempt if setting icon not displayed.
                }
            }, 1000);
        }

        // Reset Draft Comments Data.
        const CurrentPostID = wp.data.select('core/editor').getCurrentPostId(); // eslint-disable-line
        var data = {
            'action': 'cf_reset_drafts_meta',
            'currentPostID': CurrentPostID,
        };
        $.post(ajaxurl, data, function () { // eslint-disable-line
        });
    }
}

function bring_back_comments() {

    // Reset Draft Comments Data.
    const CurrentPostID = wp.data.select('core/editor').getCurrentPostId(); // eslint-disable-line
    var data = {
        'action': 'cf_merge_draft_stacks',
        'currentPostID': CurrentPostID,
    };
    $.post(ajaxurl, data, function (response) { // eslint-disable-line

        response = JSON.parse(response);

        if (response.resolved) {
            $.each(response.resolved, function (k, el) {
                el = el.replace('_', '');
                $('#' + el).addClass('reverted_back resolved');
                // Hide popups if their tags don't exist.
                if (0 === $('[datatext="' + el + '"]').length) {
                    $('#' + el).hide();
                }
            });
        }

        if (response.comments) {
            $.each(response.comments, function (el, timestamps) {
                $.each(timestamps, function (el, t) {
                    $('#' + t).removeClass('publish').addClass('reverted_back added');
                    /*taking extra care to display new threads*/
                    var appendStyle = `<style>[id="${t}"]{display: block !important}</style>`
                    $('head').append(DOMPurify.sanitize( appendStyle )); // phpcs:ignore
                });
            });
        }

        if (response.deleted) {
            $.each(response.deleted, function (el, timestamps) {
                $.each(timestamps, function (el, t) {
                    $('#' + t).remove();
                });
            });
        }

        if (response.edited) {
            $.each(response.edited, function (el, timestamps) {

                $.each(timestamps, function (el, t) {
                    $('#' + t).removeClass('publish').addClass('reverted_back edited');

                    // Update the component with new text.
                    const someElement = document.getElementById(t);
                    const myComp = FindReact(someElement);
                    myComp.setState({showEditedDraft: true});

                    $('#' + t + ' .commentText').append(' <i style="font-size:12px;color:#23282dba">(edited)</i>');
                });
            });
        }

        // Update unresolved comments count.
        $('#history-toggle').attr('data-count', $('.cls-board-outer:visible').length);
    });

    return false;
}

function FindReact(dom, traverseUp = 0) {
    const key = Object.keys(dom).find(key => key.startsWith("__reactInternalInstance$"));
    const domFiber = dom[key];
    if (domFiber == null) return null;

    // react <16
    if (domFiber._currentElement) {
        let compFiber = domFiber._currentElement._owner;
        for (let i = 0; i < traverseUp; i++) {
            compFiber = compFiber._currentElement._owner;
        }
        return compFiber._instance;
    }

    // react 16+
    const GetCompFiber = fiber => {
        //return fiber._debugOwner; // this also works, but is __DEV__ only
        let parentFiber = fiber.return;
        while (typeof parentFiber.type == "string") {
            parentFiber = parentFiber.return;
        }
        return parentFiber;
    };
    let compFiber = GetCompFiber(domFiber);
    for (let i = 0; i < traverseUp; i++) {
        compFiber = GetCompFiber(compFiber);
    }
    return compFiber.stateNode;
}

function createBoard(selectedText, value, onChange) {
    var referenceNode = document.getElementById('md-span-comments');
    var newNode = document.createElement('div');
    newNode.setAttribute("id", selectedText);
    newNode.setAttribute("class", "cls-board-outer is_active");

    referenceNode.appendChild(newNode);
    ReactDOM.render(
        <Board datatext={selectedText} lastVal={value} onChanged={onChange}/>,
        document.getElementById(selectedText)
    )
}

// Register Custom Format Type: Comment.
const name = 'multidots/comment';
const title = __('Comment');
const mdComment = {
    name,
    title,
    tagName: 'mdspan',
    className: 'mdspan-comment',
    attributes: {
        datatext: 'datatext'
    },
    edit: (class toggleComments extends Component {
        constructor(props) {
            super(props);

            this.onToggle = this.onToggle.bind(this);
            this.getSelectedText = this.getSelectedText.bind(this);
            this.floatComments = this.floatComments.bind(this);

            // Typecheck.
            toggleComments.propTypes = {
                value: PropTypes.object,
                activeAttributes: PropTypes.object,
                onChange: PropTypes.func,
                isActive: PropTypes.bool,
            };
        }

        onToggle() {
            const {value, onChange} = this.props;
            let {text, start, end} = value;
            const commentedOnText = text.substring(start, end);

            // If text is not selected, show notice.
            if (start === end) {
                alert('Please select text to comment on.');
                return;
            }

            var currentTime = Date.now();
            currentTime = 'el' + currentTime;
            var newNode = document.createElement('div');
            newNode.setAttribute("id", currentTime);
            newNode.setAttribute("class", 'cls-board-outer');

            var referenceNode = document.getElementById('md-span-comments');

            referenceNode.appendChild(newNode);
            $('#history-toggle').attr('data-count', $('.cls-board-outer:visible').length);

            onChange(toggleFormat(value, {type: name}),
                ReactDOM.render(
                    <Board datatext={currentTime} onChanged={onChange} lastVal={value} freshBoard={1} commentedOnText={commentedOnText}/>,
                    document.getElementById(currentTime)
                )
            );

            onChange(applyFormat(value, {type: name, attributes: {datatext: currentTime}}));

            // Making hide comment triggered when clicking on the ReichToolbar Comment menu.
            // This occurs if user hide comments before and now wants to add Comment.
            if( $( '#comments-toggle' ).hasClass('active') ) {
                $( '#comments-toggle' ).trigger( 'click' );
                $( '#custom-history-popup' ).removeClass( 'active' );
                $( '.custom-buttons' ).removeClass( 'active' );
            }

        }

        getSelectedText() {
            const { onChange, value, activeAttributes } = this.props;

            // Prevent on locked mode + fix for unnecessary calls on hover.
            if ($('.cls-board-outer').hasClass('locked') ) {
                return;
            }

            // Ignore unnecessary event calls on hover.
            if ($('#' + activeAttributes.datatext + '.cls-board-outer').hasClass('focus')) {
                return;
            }

            // Reset Comments Float only if the selected text has no comments on it.
            if (undefined === activeAttributes.datatext) {
                $('#md-span-comments .cls-board-outer').css('opacity', '1');
                $('#md-span-comments .cls-board-outer').removeClass('focus');
                $('#md-span-comments .cls-board-outer').removeAttr('style');

                //ne_pending remove the attr true
                $('mdspan').removeAttr('data-rich-text-format-boundary');
            }

            const referenceNode = document.getElementById('md-span-comments');

            // Remove tags if selected tag ID exist in 'remove-comment' attribute of body.
            let removedComments = $('body').attr('remove-comment');
            if (undefined !== activeAttributes.datatext &&
                (undefined !== removedComments && removedComments.indexOf(activeAttributes.datatext) !== -1)
            ) {
                onChange(removeFormat(value, name));
            }

            if (undefined !== this.props.value.start && null !== referenceNode) {
                let selectedText;

                $('.cls-board-outer').removeClass('has_text');

                // Sync popups with highlighted texts.
                $('.wp-block mdspan').each(function () {

                    selectedText = $(this).attr('datatext');

                    // Bring back CTRL-Z'ed Text's popup.
                    if (undefined !== selectedText && $('#' + selectedText).length === 0) {

                        let removedComments = $('body').attr('remove-comment');
                        if (undefined === removedComments ||
                            (undefined !== removedComments && removedComments.indexOf(selectedText) === -1)
                        ) {
                            createBoard(selectedText, value, onChange);
                        } else {
                            $('[datatext="' + selectedText + '"]').css('background', 'transparent');
                        }
                    }
                    $('#history-toggle').attr('data-count', $('.cls-board-outer:visible').length);
                    $('#' + selectedText).addClass('has_text').show();
                });

                selectedText = activeAttributes.datatext;

                // Delete the popup and its highlight if user
                // leaves the new popup without adding comment.
                if (1 === $('.board.fresh-board').length && 0 === $('.board.fresh-board .loading').length) {
                    const latestBoard = $('.board.fresh-board').parents('.cls-board-outer').attr('id');
                    if (selectedText !== latestBoard) {
                        removeTag(latestBoard); // eslint-disable-line
                        $('#' + latestBoard).remove();
                        $('#history-toggle').attr('data-count', $('.cls-board-outer:visible').length);
                    }
                }

                // Just hide these popups and only display on CTRLz
                $('#md-span-comments .cls-board-outer:not(.has_text):not([data-sid])').each(function () {
                    $(this).hide();
                    $('#history-toggle').attr('data-count', $('.cls-board-outer:visible').length);
                });

                // Adding lastVal and onChanged props to make it deletable,
                // these props were not added on load.
                // It also helps to 'correct' the lastVal of CTRL-Z'ed Text's popup.
                if ($('#' + selectedText).length !== 0) {
                    ReactDOM.render(
                        <Board datatext={selectedText} lastVal={value} onChanged={onChange}/>,
                        document.getElementById(selectedText)
                    )
                }

                // Float comments column.
                this.floatComments(selectedText);
            }
        }

        floatComments(selectedText) {
            if ($('mdspan[data-rich-text-format-boundary="true"]').length !== 0) {


                // Removing dark highlights from other texts,
                // only if current active text has an attribute,
                // and no 'focus' class active on mdspan tag.
                // This condition prevents thread popup flickering
                // when navigating through the activity center.

                // Adding focus on selected text's popup.
                $('.cls-board-outer').removeClass('focus');
                $('#' + selectedText + '.cls-board-outer').addClass('focus');

                $('mdspan:not([datatext="' + selectedText + '"])').removeAttr('data-rich-text-format-boundary');



                $('#md-span-comments .cls-board-outer').css('opacity', '0.4');
                $('#md-span-comments .cls-board-outer.focus').css('opacity', '1');

                $('#md-span-comments .cls-board-outer').css('top', 0);
                $('#' + selectedText).offset({top: $('[datatext="' + selectedText + '"]').offset().top});
            }
        }

        render() {
            const {isActive} = this.props;

            return (
                <Fragment>
                    <RichTextToolbarButton
                        title={__('Comment')}
                        isActive={isActive}
                        icon="admin-comments"
                        onClick={this.onToggle}
                        shortcutType="primary"
                        shortcutCharacter="m"
                        className={`toolbar-button-with-text toolbar-button__${name}`}
                    />
                    {
                        <Fragment>
                            {this.getSelectedText()}
                        </Fragment>
                    }

                </Fragment>
            );
        }
    }),
};
registerFormatType(name, mdComment);
