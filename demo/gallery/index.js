import React, { Component } from 'react';
import {
  View,
} from 'react-native';

import ZoomImage from '../zoomimage/index';
import ViewPager from './viewpager/index';
import createResponder from '../zoomimage/gesture/index';

const DEFAULT_FLAT_LIST_PROPS = {
  windowSize: 3
};

export default class extends Component {

  static defaultProps = {
    removeClippedSubviews: true,
    imageComponent: undefined,
    scrollViewStyle: {},
    flatListProps: DEFAULT_FLAT_LIST_PROPS,
    showPagenation: true,
  }
  
  constructor(props) {
    super(props);
    this.imageRef = new Map();
    this.activeResponder = undefined;
    this.firstMove = true;
    this.currentPage = 0;
    this.pageCount = 0;
    props.onGalleryStateChanged && props.onGalleryStateChanged(true);
    this.gestureResponder = createResponder({
      onStartShouldSetResponderCapture: () => true,
      onStartShouldSetResponder: () => true,
      onResponderGrant: this.onResponderGrant,
      onResponderMove: this.onResponderMove,
      onResponderRelease: this.onResponderRelease,
      onResponderTerminate: this.onResponderRelease,
      onResponderTerminationRequest: () => false,
      onResponderSingleTapConfirmed: () => {
        this.props.onSingleTapConfirmed && this.props.onSingleTapConfirmed(this.currentPage);
      }
    });
    this.viewPagerResponder = {
      onStart: (evt, gestureState) => {
        this.getViewPagerInstance().onResponderGrant(evt, gestureState);
      },
      onMove: (evt, gestureState) => {
        this.getViewPagerInstance().onResponderMove(evt, gestureState);
      },
      onEnd: (evt, gestureState, disableSettle) => {
        this.getViewPagerInstance().onResponderRelease(evt, gestureState, disableSettle);
      },
    };
    this.imageResponder = {
      onStart: (evt, gestureState) => {
        const currentImageTransformer = this.getCurrentImageTransformer();
        currentImageTransformer && currentImageTransformer.onResponderGrant(evt, gestureState);
        if (this.props.onLongPress) {
          this._longPressTimeout = setTimeout(() => {
            this.props.onLongPress(gestureState);
          }, 600);
        }
      },
      onMove: (evt, gestureState) => {
        const currentImageTransformer = this.getCurrentImageTransformer();
        currentImageTransformer && currentImageTransformer.onResponderMove(evt, gestureState);
        this._longPressTimeout && clearTimeout(this._longPressTimeout);
      },
      onEnd: (evt, gestureState) => {
        const currentImageTransformer = this.getCurrentImageTransformer();
        currentImageTransformer && currentImageTransformer.onResponderRelease(evt, gestureState);
        clearTimeout(this._longPressTimeout);
    }
    }      
  }

  onResponderGrant = (event, gestureState) => {
    this.activeImageResponder(event, gestureState);
  };

  onResponderMove = (event, gestureState) => {
    if (this.firstMove) {
      this.firstMove = false;
      if (this.shouldScrollViewPager(event, gestureState)) {
        this.activeViewPagerResponder(event, gestureState);
      }
      this.props.onGalleryStateChanged && this.props.onGalleryStateChanged(false);
    }
    if (this.activeResponder === this.viewPagerResponder) {
      const dx = gestureState.moveX - gestureState.previousMoveX;
      const offset = this.getViewPagerInstance().getScrollOffsetFromCurrentPage();
      if (dx > 0 && offset > 0 && !this.shouldScrollViewPager(event, gestureState)) {
        if (dx > offset) {
          this.getViewPagerInstance().scrollByOffset(offset);
          gestureState.moveX -= offset;
          this.activeImageResponder(event, gestureState);
        }
      } else if (dx < 0 && offset < 0 && !this.shouldScrollViewPager(event, gestureState)) {
        if (dx < offset) {
          this.getViewPagerInstance().scrollByOffset(offset);
          gestureState.moveX -= offset;
          this.activeImageResponder(event, gestureState);
        }
      }
    }
    this.activeResponder.onMove(event, gestureState);
  };

  onResponderRelease = (event, gestureState) => {
    if (this.activeResponder) {
      if (this.activeResponder === this.viewPagerResponder
        && !this.shouldScrollViewPager(event, gestureState)
        && Math.abs(gestureState.vx) > 0.5) {
        this.activeResponder.onEnd(event. gestureState, true);
        this.getViewPagerInstance().flingToPage(this.currentPage, gestureState.vx);
      } else {
        this.activeResponder.onEnd(event, gestureState);
      }
      this.activeResponder = null;
    }
    this.firstMove = true;
    this.props.onGalleryStateChanged && this.props.onGalleryStateChanged(true);
  };

  shouldScrollViewPager = (event, gestureState) => {
    if (gestureState.numberActiveTouches > 1) {
      return false;
    }
    const viewTransformer = this.getCurrentImageTransformer();
    if (!viewTransformer) {
      return false;
    }
    const space = viewTransformer.getAvailableTranslateSpace();
    const dx = gestureState.moveX - gestureState.previousMoveX;

    if (dx > 0 && space.left <= 0 && this.currentPage > 0) {
      return true;
    }

    if (dx < 0 && space.right <= 0 && this.currentPage < this.pageCount - 1) {
      return true;
    }

    return false;
  };

  activeImageResponder = (event, gestureState) => {
    if (this.activeResponder !== this.imageResponder) {
      if (this.activeResponder === this.viewPagerResponder) {
        this.viewPagerResponder.onEnd(event, this.gestureResponder);
      }
      this.activeResponder = this.imageResponder;
      this.imageResponder.onStart(event, gestureState);
    }
  };

  activeViewPagerResponder = (event, gestureState) => {
    if (this.activeResponder !== this.viewPagerResponder) {
      if (this.activeResponder === this.imageResponder) {
        this.imageResponder.onEnd(event, this.gestureResponder);
      }
      this.activeResponder = this.viewPagerResponder;
      this.viewPagerResponder.onStart(event, gestureState);
    }
  };

  getImageTransformer = (page) => {
    if (page >= 0 && page < this.pageCount) {
      let ref = this.imageRef.get(page);
      if (ref) {
        return ref.getViewTransformerInstance();
      }
    }
  };

  getCurrentImageTransformer = () => {
    return this.getImageTransformer(this.currentPage);
  };

  getViewPagerInstance = () => {
    return this.refs["galleryViewPager"];
  };

  onPageSelected = (page) => {
    this.currentPage = page;
    this.props.onPageSelected && this.props.onPageSelected(page);
  };

  onPageScrollStateChanged = (state) => {
    if (state === 'idle') {
      this.resetHistoryImageTransform();
    }
    this.props.onPageScrollStateChanged && this.props.onPageScrollStateChanged(state);
  };

  onPageScroll = (e) => {
    this.props.onPageScroll && this.props.onPageScroll(e);
  };

  render() {
    let gestureResponder = this.gestureResponder;
    let images = this.props.images;
    if (!images) {
      images = [];
    }
    this.pageCount = images.length;
    if (this.pageCount <= 0) {
      gestureResponder = {};
    }
    const flatListProps = {...DEFAULT_FLAT_LIST_PROPS, ...this.props.flatListProps}
    return (
      <ViewPager
        {...this.props}
        flatListProps={flatListProps}
        ref={'galleryViewPager'}
        scrollEnabled={false}
        scrollViewStyle={this.props.scrollViewStyle}
        renderPage={this.renderPage}
        pageDataArray={images}
        {...gestureResponder}
        onPageSelected={this.onPageSelected}
        onPageScrollStateChanged={this.onPageScrollStateChanged}
        onPageScroll={this.props.onPageScroll}
        removeClippedSubviews={this.props.removeClippedSubviews}
      />
    );
  }

  renderPage = (pageData, pageId) => {
    const { onViewTransformed, onTransformGestureReleased, errorComponent, loadComponent } = this.props;
    return (
      <ZoomImage 
        onViewTransformed={((transform) => {
          onTransformGestureReleased && onTransformGestureReleased(transform, pageId);
        })}
        onTransformGestureReleased={((transform) => {
          return onTransformGestureReleased && onTransformGestureReleased(transform, pageId);
        })}
        enableTransform={false}
        ref={(r) => this.imageRef.set(pageId, r)}
        key={'innerImage_' + pageId}
        errorComponent={errorComponent}
        loadComponent={loadComponent}
        image={pageData}
      />
    );
  };

  resetHistoryImageTransform = () => {
    let transformer = this.getImageTransformer(this.currentPage + 1);
    if (transformer) {
      transformer.forceUpdateTransform({scale: 1, translateX: 0, translateY: 0});
    }
    transformer = this.getImageTransformer(this.currentPage - 1);
    if (transformer) {
      transformer.forceUpdateTransform({scale: 1, translateX: 0, translateY: 0});
    }
  };
}