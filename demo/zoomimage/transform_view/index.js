import React, { Component } from 'react';
import ReactNative, {
    View,
    Animated,
    Easing,
    NativeModules,
} from 'react-native';
import Scroller from 'react-native-scroller';
import {
  Rect,
  Transform,
  fitCenterRect,
  transformedRect,
  getTransform,
  alignedRect,
  availableTranslateSpace,
} from './TransformUntils';
import createResponder from '../gesture/index';

export default class extends Component {

  static defaultProps = {
    maxOverScrollDistance: 20,
    enableScale: true,
    enableTranslate: true,
    enableTransform: true,
    maxScale: 1,
    enableResistance: false,
    isFullScreen: false,
  };

  static Rect = Rect;
  static getTransform = getTransform;

  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      translateX: 0,
      translateY: 0,

      animator: new Animated.Value(0),

      width: 0,
      height: 0,
      pageX: 0,
      pageY: 0,
    };
    this.lastScale = 1;
    this._viewPortRect = new Rect();
    this._cropRect = new Rect();
    this.scroller = new Scroller(true, (dx, dy, scroller) => {
      if (dx === 0 && dy === 0 && scroller.isFinished()) {
        this.animateBounce();
        return;
      }

      if (isNaN(dx)) {
        dx = 0;
      }
      if (isNaN(dy)) {
        dy = 0;
      }

      this.updateTransform({
        translateX: this.state.translateX + dx / this.state.scale,
        translateY: this.state.translateY + dy / this.state.scale,
      });
    });
  }

  /**
   * 拿到窗口位置信息
   */
  viewPortRect = () => {
    this._viewPortRect.set(0, 0, this.state.width, this.state.height);
    return this._viewPortRect;
  }

  cropPortRect = () => {
    return this._cropRect;
  }

  /**
   * 获取当前视图适应窗口的位置信息
   */
  contentRect = () => {
    let rect = this.viewPortRect().copy();
    if (this.props.contentAspectRatio && this.props.contentAspectRatio > 0) {
      // 适应窗口的比例进行裁剪的Rect
      rect = fitCenterRect(this.props.contentAspectRatio, rect);
    }
    return rect;
  }

  /**
   * 获取当前窗口到当前视图的Transform（移动信息）
   */
  transformedContentRect = () => {
    let rect = transformedRect(this.viewPortRect(), this.currentTransform(), 'transformedContentRect');
    if (this.props.contentAspectRatio && this.props.contentAspectRatio > 0) {
      rect = fitCenterRect(this.props.contentAspectRatio, rect);
    }
    return rect;
  }

  /**
   * 当前试图的位置信息
   */
  currentTransform = () => {
    return new Transform(this.state.scale, this.state.translateX, this.state.translateY);
  }

  /**
   * 取消动画
   */
  cancelAnimation = () => {
    this.state.animator.stopAnimation();
  }

  /**
   * 动画
   */
  animate = (targetRect, durationInMillis) => {
    let duration = 200;
    if (durationInMillis) {
      duration = durationInMillis;
    }
    let fromRect = this.transformedContentRect();
    if (fromRect.equals(targetRect)) {
      console.log('animate...equal rect, skip animation');
      return;
    }
    this.state.animator.removeAllListeners();
    this.state.animator.setValue(0);
    
    this.state.animator.addListener((state) => {
      let progress = state.value;
      let left = fromRect.left + (targetRect.left - fromRect.left) * progress;
      let right = fromRect.right + (targetRect.right - fromRect.right) * progress;
      let top = fromRect.top + (targetRect.top - fromRect.top) * progress;
      let bottom = fromRect.bottom + (targetRect.bottom - fromRect.bottom) * progress;
      let transform = getTransform(this.contentRect(), new Rect(left, top, right, bottom));
      if (this.state.scale > 1 && this.props.marginRect) {
        if (targetRect.left === 0) {
          transform.translateX -= (this.props.marginRect.left * (this.state.scale - 1)) / this.state.scale;
        }
        if (targetRect.top === 0) {
          transform.translateY -= (this.props.marginRect.top * (this.state.scale - 1)) / this.state.scale;
        }
        if (targetRect.right === this.props.marginRect.screenWidth) {
          transform.translateX += (this.props.marginRect.right * (this.state.scale - 1)) / this.state.scale;
        }
        duration = 150;
      }
      this.updateTransform(transform);
    });
    Animated.timing(this.state.animator, {
      toValue: 1,
      duration: duration,
      easing: Easing.inOut(Easing.ease),
    }).start();
  }

  /**
   * 移动超出边界之后dx和dy有阻
   */
  applyResistance = (dx, dy) => {
    let availablePanDistance = availableTranslateSpace(this.transformedContentRect, this.viewPortRect);
    if ((dx > 0 && availablePanDistance.left < 0)
      ||(dx < 0 && availablePanDistance.right < 0)) {
      dx /= 3;
      }
    if ((dy > 0 && availablePanDistance.top < 0)
      ||(dy < 0 && availablePanDistance.bottom < 0)) {
        dy /= 3;
      }
    return {dx, dy};
  }

  /**
   * 设置当前视图的绝对位置
   */
  measureLayout() {
    let handle = ReactNative.findNodeHandle(this.refs['innerViewRef']);
    NativeModules.UIManager.measure(handle, ((x, y, width, height, pageX, pageY) => {
      if(typeof pageX === 'number' && typeof pageY === 'number') { //avoid undefined values on Android devices
        if(this.state.pageX !== pageX || this.state.pageY !== pageY) {
          this.setState({
            pageX: pageX,
            pageY: pageY
          });
        }
      }
    }).bind(this));
  }

  /**
   * 处理双击
   */
  performDoubleTapUp = (pivotX, pivotY) => {
    console.log('performDoubleTapUp...pivot=' + pivotX + ', ' + pivotY);
    this.props.onTransformGestureReleased && this.props.onTransformGestureReleased({
      scale: this.state.scale,
      translateX: this.state.translateX,
      translateY: this.state.translateY,
    });
    let curScale = this.state.scale;
    let scaleBy;
    if (curScale > (1 + this.props.maxScale) / 2) {
      scaleBy = 1 / curScale;
    } else {
      scaleBy = this.props.maxScale / curScale;
    }

    let rect = transformedRect(this.transformedContentRect(), new Transform(
      scaleBy, 0, 0,
      {
        x: pivotX,
        y: pivotY,
      }),
      'performDoubleTapUp1',
    );
    rect = transformedRect(
      rect,
      new Transform(1, this.viewPortRect().centerX() - pivotX, this.viewPortRect().centerY() - pivotY),
      'performDoubleTapUp2',
    );
    rect = alignedRect(rect, this.viewPortRect());
    this.animate(rect);
  }

  /**
   * 处理滑动 
   */
  performFling = (vx, vy) => {
    let startX = 0;
    let startY = 0;
    let maxX, maxY, minX, minY;
    let availablePanDistance = availableTranslateSpace(this.transformedContentRect(), this.viewPortRect());
    if (vx > 0) {
      minX = 0;
      if (availablePanDistance.left > 0) {
        maxX = availablePanDistance.left + this.props.maxOverScrollDistance;
      } else {
        maxX = 0;
      }
    } else {
      maxX = 0;
      if (availablePanDistance.right > 0) {
        minX = -availablePanDistance.right - this.props.maxOverScrollDistance;
      } else {
        minX = 0;
      }
    }
    if (vy > 0) {
      minY = 0;
      if (availablePanDistance.top > 0) {
        maxY = availablePanDistance.top + this.props.maxOverScrollDistance;
      } else {
        maxY = 0;
      }
    } else {
      maxY = 0;
      if (availablePanDistance.bottom > 0) {
        minY = -availablePanDistance.bottom - this.props.maxOverScrollDistance;
      } else {
        minY = 0;
      }
    }

    vx *= 1000;
    vy *= 1000;
    if (Math.abs(vx) > 2 * Math.abs(vy)) {
      vy = 0;
    } else if (Math.abs(vy) > 2 * Math.abs(vx)) {
      vx = 0;
    }

    this.scroller.fling(startX, startY, vx, vy, minX, maxX, minY, maxY);
  }

  /**
   * 缩放，位置为试图的中心
   */
  animateBounce = () => {
    let curScale = this.state.scale;
    let minScale = 1;
    let maxScale = this.props.maxScale;
    let scaleBy = 1;
    if (curScale > maxScale) {
      scaleBy = maxScale / curScale;
    } else if (curScale < minScale) {
      scaleBy = minScale / curScale;
    }
    let rect = transformedRect(this.transformedContentRect(), new Transform(
      scaleBy, 0, 0,
      {
        x: this.viewPortRect().centerX(),
        y: this.viewPortRect().centerY(),
      }),
      'animateBounce',
    );
    if (!this.props.marginRect) {
      rect =  alignedRect(rect, this.viewPortRect());
      this.animate(rect);
      return;
    }
    let diffRect = {
      left: 0,
      top: 0,
      right: 0,
      bottom: this.props.diffHeight + (this.props.viewHeight - 608) * (curScale - 1),
    };
    rect = alignedRect(rect, this.viewPortRect(), diffRect);
    this.animate(rect);
  }

  /**
   * 更新位置
   * @param {Transform} transform 
   */
  updateTransform(transform) {
    this.setState(transform);
  }

  onResponderGrant = (evt, gestureState) => {
    this.props.onTransformStart && this.props.onTransformStart();
    this.setState({responderGranted: true});
    this.measureLayout();
  }

  onResponderMove = (evt, gestureState) => {
    this.cancelAnimation();
    let dx = gestureState.moveX - gestureState.previousMoveX;
    let dy = gestureState.moveY - gestureState.previousMoveY;
    if (this.props.enableResistance) {
      let d = this.applyResistance(dx, dy);
      dx = d.dx;
      dy = d.dy;
    }
    if (!this.props.enableTranslate) {
      dx = dy = 0;
    }

    let transform = {};
    if (gestureState.previousPinch && gestureState.pinch && this.props.enableScale) {
      let scaleBy = gestureState.pinch / gestureState.previousPinch;
      let pivotX = gestureState.moveX - this.state.pageX;
      let pivotY = gestureState.moveY - this.state.pageY;
      let rect = transformedRect(
        transformedRect(this.contentRect(),
        this.currentTransform(), 'onResponderMove1'),
        new Transform(
          scaleBy, dx, dy,
          {
            x: pivotX,
            y: pivotY,
          }),
        'onResponderMove2',
      );
      transform = getTransform(this.contentRect(), rect);
    } else {
      if (Math.abs(dx) > 2 * Math.abs(dy)) {
        dy = 0;
      } else if (Math.abs(dy) > 2 * Math.abs(dx)) {
        dx = 0;
      }
      transform.translateX = this.state.translateX + dx / this.state.scale;
      transform.translateY = this.state.translateY + dy / this.state.scale;
    }
    this.updateTransform(transform);
    return true;
  }

  onResponderRelease = (evt, gestureState) => {
    let handler = this.props.onTransformGestureReleased && this.props.onTransformGestureReleased({
      scale: this.state.scale,
      translateX: this.state.translateX,
      translateY: this.state.translateY,
    });
    if (handler) {
      return;
    }

    if (gestureState.doubleTapUp) {
      if (!this.props.enableScale) {
        this.animateBounce();
        return;
      }
      let pivotX = 0, pivotY = 0;
      if (gestureState.dx || gestureState.dy) {
        pivotX = gestureState.moveX - this.state.pageX;
        pivotY = gestureState.moveY - this.state.pageY;
      } else {
        pivotX = gestureState.x0 - this.state.pageX;
        pivotY = gestureState.y0 - this.state.pageY;
      }
      this.performDoubleTapUp(pivotX, pivotY);
    } else {
      if (this.props.enableTranslate) {
        this.performFling(gestureState.vx, gestureState.vy);
      } else {
        this.animateBounce();
      }
    }
  }

  componentDidMount() {
    this.gestureResponder = createResponder({
      onStartShouldSetResponder: (evt, gestureState) => true,
      onMoveShouldSetResponderCapture: (evt, gestureState) => true,
      onResponderMove: this.onResponderMove,
      onResponderGrant: this.onResponderGrant,
      onResponderRelease: this.onResponderRelease,
      onResponderTerminate: this.onResponderRelease,
      onResponderTerminateRequest: (evt, gestureState) => true,
      onResponderSingleTapConfirmed: (evt, gestureState) => {
        this.props.onSingleTapConfirmed && this.props.onSingleTapConfirmed();
      },
    });
    this._cropRect.set(this.props.left, this.props.top, this.props.right, this.props.bottom);
  }

  componentDidUpdate(prevProps, prevState) {
    this.props.onViewTransformed && this.props.onViewTransformed({
      scale: this.state.scale,
      translateX: this.state.translateX,
      translateY: this.state.translateY,
    });
  }

  componentWillUnmount() {
    this.cancelAnimation();
  }

  onLayout = (e) => {
    const {width, height} = e.nativeEvent.layout;
    if (width !== this.state.width || this.height !== this.state.height) {
      this.setState({width, height});
    }
    this.measureLayout();
    this.props.onLayout && this.props.onLayout();
  }

  render() {
    let gestureResponder = this.gestureResponder;
    if (!this.props.enableTransform) {
      gestureResponder = {};
    }
    return (
      <View
        {...this.props}
        {...gestureResponder}
        ref={'innerViewRef'}
        onLayout={this.onLayout.bind(this)}>
        <View
          style={{
            flex: 1,
            transform: [
                  {scale: this.state.scale},
                  {translateX: this.state.translateX},
                  {translateY: this.state.translateY}
                ]
          }}>
          {this.props.children}
        </View>
      </View>
    );
  }

  forceUpdateTransform(transform) {
    this.setState(transform);
  };

  getAvailableTranslateSpace() {
    return availableTranslateSpace(this.transformedContentRect(), this.viewPortRect());
  }
}