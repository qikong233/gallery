import React, { PureComponent } from 'react';
import {
  View,
  Image,
  Animated,
  Dimensions,
  Platform,
  Text,
  ActivityIndicator,
} from 'react-native';
import TransformView from './transform_view';
import resolveAssetSource from 'resolveAssetSource';

const {width, height} = Dimensions.get('window');

export default class extends PureComponent {

  static defaultProps = {
    angle: 0,
    cropRect: {
      top: 100,
      left: 5,
      right: 5,
      bottom: 100,
    },
    fullScreen: false,
    enableTransform: true,
    enableScale: true,
    enableTranslate: true,
    imageComponent: undefined,
    resizeMode: 'contain'
  }

  constructor(props) {
    super(props);
    this.state = {
      shouldUpdate: false,
      diffHeight: null,
      viewHeight: null,

      viewWidth: 0,
      viewHeight: 0,
      error: false,

      imageLoaded: false,
      imageDimensions: props.image && props.image.dimensions || undefined,
      keyAcumulator: 1,
    };
    this.rotateAnim = new Animated.Value(0);
    this.imageHeight = 0;
  };

  componentWillMount() {
    if (!this.state.imageDimensions) {
      source = this.props.image && this.props.image.source;
      this.getImageSize(source);
    }
  };

  componentDidMount() {
    this._mounted = true;
  }

  componentWillReceiveProps(nextProps) {
    if (!sameSource(this.props.source, nextProps.source)) {
      this.setState({pixels: undefined, keyAcumulator: this.state.keyAcumulator + 1})
      if (!nextProps.image.dimensions) {
        this.getImageSize(nextProps.source);
      }
    }
  };

  componentWillUnmount() {
    this._mounted = false;
  }

  setAngle = angle => {
    Animated.timing(this.rotateAnim, {
      toValue: angle,
      duration: 200,
    }).start(() => {
      if (angle === 360) this.rotateAnim.setValue(0);
    });
  };

  onLayout = (e) => {
    const {width, height} = e.nativeEvent.layout;
    if (!this.props.marginRect) {
      if (this.state.viewWidth != width && this.state.viewHeight != height) {
        this.setState({
          imageWidth: width,
          viewHeight: height,
        });
      }
      return;
    }
    if (this.source.width === this.source.height) return;
    this.imageHeight = width * this.source.height / this.source.width;
    this.setState({
      viewWidth: width,
      viewHeight: height,
      shouldUpdate: true,
      diffHeight: this.imageHeight - this.props.marginRect.cropWidth - 1,
      imageHeight: this.imageHeight,
    });
  };

  render() {
    const { imageDimensions, viewWidth, viewHeight, error, keyAcumulator, imageLoaded } = this.state;
    const {
      style,
      image,
      imageComponent,
      resizeMode,
      enableTransform,
      enableScale,
      enableTranslate,
      onTransformGestureReleased,
      onViewTransformed } = this.props;
    let maxScale = 2;
    let contentAspectRatio;
    let width, height;

    if (imageDimensions) {
      width = imageDimensions.width;
      height = imageDimensions.height;
    }

    if (width && height) {
      contentAspectRatio = width / height;
      if (viewWidth && viewHeight) {
          maxScale = Math.max(width / viewWidth, height / viewHeight);
          maxScale = Math.max(1, maxScale);
      }
    }

    const imageProps = {
      ...this.props,
      imageLoaded,
      source: image.source,
      style: [style, { backgroundColor: 'transparent' }],
      resizeMode: resizeMode,
      onLoadStart: this.onLoadStart,
      onLoad: this.onLoad,
      onLoadEnd: this.onLoadEnd,
      capInsets: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 }
    };

    const transforAnim = {
      transform: [{
        rotateZ: this.rotateAnim.interpolate({
          inputRange: [0, 90, 180, 360],
          outputRange: ['0deg', '90deg', '180deg', '360deg'],
        }),
      }],
    }

    const ImageContent = (
      <Animated.Image
        onLayout={this.onLayout}
        {...imageProps}
        style={[
          transforAnim,
          this.props.style,
          imageProps.style,
          this.props.fullScreen && this.state.shouldUpdate && {height: this.imageHeight}
        ]}
      />
    );

    const loading = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    };

    const errorContent = (
      <View style={loading}>
        {this.props.errorComponent ||
        (<Text style={{fontSize: 20, color: 'white'}}>Load Error!</Text>)}
      </View>
    );
    const loadContent = (
      <View style={loading}>
        {this.props.loadComponent || (<ActivityIndicator color="white"/>)}
      </View>
    );

    return (
      <TransformView
        ref={r => this.transformView = r}
        key={'transformView_' + this.state.keyAcumulator}
        enableTransform={this.props.enableTransform && this.state.imageLoaded && !this.state.error}
        enableScale={this.state.error ? false : this.props.enableScale}
        enableTranslate={this.state.error ? false : this.props.enableTranslate}
        enableResistance={true}
        onTransformGestureReleased={this.props.onTransformGestureReleased}
        onViewTransformed={this.props.onViewTransformed}
        onSingleTapConfirmed={this.props.onSingleTapConfirmed}
        contentAspectRatio={contentAspectRatio}
        style={[this.props.style, this.props.fullScreen && {flex: 1}]}
        maxScale={maxScale}
        diffHeight={this.state.diffHeight} 
        viewHeight={this.state.imageHeight}
        marginRect={this.props.marginRect}
      >
        {this.state.error ? errorContent :ImageContent}
        {this.state.imageLoaded ? null : loadContent}
      </TransformView>
    );
  }

  getViewTransformerInstance = () => {
    return this.transformView ? this.transformView : null;
  };

  onLoadStart = (e) => {
    this.props.onLoadStart && this.props.onLoadStart(e);
    this.setState({
      imageLoaded: false,
    });
  };

  onLoad = (e) => {
    this.props.onLoad && this.props.onLoad(e);
  };

  onLoadEnd = (e) => {
    this.props.onLoadEnd && this.props.onLoadEnd(e);
    this.setState({
      imageLoaded: true,
    });
  } 

  getImageSize = (source) => {
    if (!source) return;
    if (source && source.uri) {
    //---------------------from net--------------------------//
      Image.getSize(source.uri, (width, height) => {
        if (width && height) {
          this.source = {width, height};
          if (this.state.imageDimensions
            && this.state.imageDimensions.width === width
            && this.state.imageDimensions.height === height) {} else {
              this._mounted && this.setState({imageDimensions: {width, height}});
            }
        }
      }, () => {
        this._mounted && this.setState({error: true, imageLoaded: true});
      });
    } else {
    //---------------------from local--------------------------//
      let source = resolveAssetSource(this.props.source);
      this.source = source;
      if (!source) return;
      const {width, height} = source;
      if (width && height) {
        if (this.state.imageDimensions
          && this.state.imageDimensions.width === width
          && this.state.imageDimensions.height === height) {} else {
            this.setState({imageDimensions: {width, height}});
          }
      }
    }
  }
}

sameSource = (source, nextSource) => {
  if (source === nextSource) {
    return true;
  }
  if (source && nextSource) {
    if (source.uri && nextSource.uri) {
      return source.uri === nextSource.uri;
    }
  }
  return false;
};