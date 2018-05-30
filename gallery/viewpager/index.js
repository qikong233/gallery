import React, { PureComponent } from 'react';
import {
  View,
  FlatList,
  Text,
  InteractionManager,
  Dimensions,
} from 'react-native';

import Scroller from 'react-native-scroller';
import createResponder from '../../zoomimage/index';

const MIN_FLING_VELOCITY = 0.5;
const { width, height } = Dimensions.get('window');

export default class extends PureComponent {

  static defaultProps = {
    showPagenation: true,
    initialPage: 0,
    pageMargin: 0,
    scrollEnabled: true,
    pageDataArray: [],
    initialListSize: 10,
    removeClippedSubviews: true,
    flatListProps: {},
  }

  state = { width, height, currentPage: undefined, description: undefined };
  layoutChanged = false;
  activeGesture = false;
  gestureResponder = undefined;

  constructor(props) {
    super(props);
    this.scroller = new Scroller(true, (dx, dy, scroller) => {
      if (dx === 0 && dy === 0 && scroller.isFinished()) {
          if (!this.activeGesture) {
              this.onPageScrollStateChanged('idle');
          }
      } else {
        const curX = this.scroller.getCurrX();
        this.refs['innerFlatList'] && this.refs['innerFlatList'].scrollToOffset({ offset: curX, animated: false });

        let position = Math.floor(curX / (this.state.width + this.props.pageMargin));
        position = this.validPage(position);
        let offset = (curX - this.getScrollOffsetOfPage(position)) / (this.state.width + this.props.pageMargin);
        let fraction = (curX - this.getScrollOffsetOfPage(position) - this.props.pageMargin) / this.state.width;
        if (fraction < 0) {
            fraction = 0;
        }
        this.props.onPageScroll && this.props.onPageScroll({
            position, offset, fraction
        });
      }
  });
  }

  componentWillMount() {
    this.gestureResponder = createResponder({
      onStartShouldSetResponder: (evt, gestureState) => true,
      onResponderGrant: this.onResponderGrant,
      onResponderMove: this.onResponderMove,
      onResponderRelease: this.onResponderRelease,
      onResponderTerminate: this.onResponderRelease
    });
  }

  componentDidMount() {
    this.onPageScrollStateChanged('settling');

      const page = this.validPage(this.props.initialPage);
      this.onPageChanged(page);

      const finalX = this.getScrollOffsetOfPage(page);
      this.scroller.startScroll(this.scroller.getCurrX(), 0, finalX - this.scroller.getCurrX(), 0, 0);
      
      requestAnimationFrame(() => {
          this.scrollByOffset(1);
          this.scrollByOffset(-1);
      });
  }

  componentDidUpdate(prevProps) {
    if (this.layoutChanged) {
      this.layoutChanged = false;
      if (typeof this.state.currentPage === 'number') {
          this.scrollToPage(this.state.currentPage, true);
      }
    } else if (this.state.currentPage + 1 >= this.props.pageDataArray.length &&
        this.props.pageDataArray.length !== prevProps.pageDataArray.length) {
        this.scrollToPage(this.props.pageDataArray.length, true);
    }
  }

  onLayout = (e) => {
    let { width, height } = e.nativeEvent.layout;
      let sizeChanged = this.state.width !== width || this.state.height !== height;
      if (width && height && sizeChanged) {
          this.layoutChanged = true;
          this.setState({ width, height });
      }
  }

  onResponderGrant = (event, gestureState) => {
    this.activeGesture = true;
      this.onPageScrollStateChanged('dragging');
  }

  onResponderMove = (event, gestureState) => {
    let dx = gestureState.moveX - gestureState.previousMoveX;
      this.scrollByOffset(dx);
  }

  onResponderRelease = (event, gestureState, disableSettle) => {
    this.activeGesture = false;
      if (!disableSettle) {
          this.settlePage(gestureState.vx);
      }
  }

  onPageChanged(page) {
    if (this.state.currentPage !== page) {
      this.setState({currentPage: page})
      this.props.onPageSelected && this.props.onPageSelected(page);
    }
  }

  onPageScrollStateChanged(state) {
    this.props.onPageScrollStateChanged && this.props.onPageScrollStateChanged(state);
  }

  settlePage(vx) {
    const { pageDataArray } = this.props;

      if (vx < -MIN_FLING_VELOCITY) {
        if (this.state.currentPage < pageDataArray.length - 1) {
            this.flingToPage(this.state.currentPage + 1, vx);
        } else {
            this.flingToPage(pageDataArray.length - 1, vx);
        }
      } else if (vx > MIN_FLING_VELOCITY) {
        if (this.state.currentPage > 0) {
            this.flingToPage(this.state.currentPage - 1, vx);
        } else {
            this.flingToPage(0, vx);
        }
      } else {
        let page = this.state.currentPage;
        let progress = (this.scroller.getCurrX() - this.getScrollOffsetOfPage(this.state.currentPage)) / this.state.width;
        if (progress > 1 / 3) {
            page += 1;
        } else if (progress < -1 / 3) {
            page -= 1;
        }
        page = Math.min(pageDataArray.length - 1, page);
        page = Math.max(0, page);
        this.scrollToPage(page);
      }
    }

  getScrollOffsetOfPage(page) {
    return this.getItemLayout(this.props.pageDataArray, page).offset;
  }

  flingToPage(page, velocityX) {
    this.onPageScrollStateChanged('settling');

    page = this.validPage(page);
    this.onPageChanged(page);

    velocityX *= -1000; // per sec
    const finalX = this.getScrollOffsetOfPage(page);
    this.scroller.fling(this.scroller.getCurrX(), 0, velocityX, 0, finalX, finalX, 0, 0);
  }

  scrollToPage(page, immediate) {
    this.onPageScrollStateChanged('settling');
      page = this.validPage(page);
      this.onPageChanged(page);

      const finalX = this.getScrollOffsetOfPage(page);
      if (immediate) {
        InteractionManager.runAfterInteractions(() => {
          this.scroller.startScroll(this.scroller.getCurrX(), 0, finalX - this.scroller.getCurrX(), 0, 0);
          this.refs['innerFlatList'] && this.refs['innerFlatList'].scrollToOffset({offset: finalX, animated: false});
          this.refs['innerFlatList'] && this.refs['innerFlatList'].recordInteraction();
        });
      } else {
        this.scroller.startScroll(this.scroller.getCurrX(), 0, finalX - this.scroller.getCurrX(), 0, 400);
      }
  }

  scrollByOffset(dx) {
    this.scroller.startScroll(this.scroller.getCurrX(), 0, -dx, 0, 0);
  };

  validPage(page) {
    page = Math.min(this.props.pageDataArray.length - 1, page);
      page = Math.max(0, page);
      return page;
  }

  getScrollOffsetFromCurrentPage() {
    return this.scroller.getCurrX() - this.getScrollOffsetOfPage(this.state.currentPage);
  }

  getItemLayout = (data, index) => {
    return {
      length: this.state.width + this.props.pageMargin,
      offset: (this.state.width + this.props.pageMargin) * index,
      index
  };
  }

  keyExtractor(item, index) {
    return 'cell_' + index;
  }

  render() {
    const { width, height } = this.state;
    const { pageDataArray, scrollEnabled, style, scrollViewStyle, showPagenation } = this.props;

    if (width && height) {
        let list = pageDataArray;
        if (!list) {
            list = [];
        }
    }

    let gestureResponder = this.gestureResponder;
    if (!scrollEnabled || pageDataArray.length <= 0) {
        gestureResponder = {};
    }

    return (
      <View
        {...this.props}
        style={[style, { flex: 1 }]}
        {...gestureResponder}>
          <FlatList
            {...this.props.flatListProps}
            style={[{ flex: 1 }, scrollViewStyle]}
            ref={'innerFlatList'}
            keyExtractor={this.keyExtractor}
            scrollEnabled={false}
            horizontal={true}
            data={pageDataArray}
            renderItem={this.renderRow}
            onLayout={this.onLayout}
            contentOffset = {{x: this.getScrollOffsetOfPage(parseInt(this.props.initialPage)), y:0}}
        />
        {showPagenation && this.renderPagenation()}
        {this.renderDescripition()}
      </View>
      );
  }

  renderPagenation () {
    return (
      <Text
        style={{
          position: 'absolute',
          color: 'white',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          paddingTop: 23,
          textAlign: 'center',
        }}
      >
        {this.state.currentPage + 1} / {this.props.pageDataArray.length}
      </Text>
    );
  }

  renderDescripition () {
    const { currentPage } = this.state;
    const { pageDataArray } = this.props;
    if (typeof(currentPage) === 'undefined') {
      return null;
    }
    let image = pageDataArray[currentPage];
    if (typeof(image.description) === 'undefined') {
      return null;
    }
    return (
      <Text
        style={{
          position: 'absolute',
          color: 'white',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#rgba(0, 0, 0, 0.5)',
          paddingBottom: 20,
          paddingLeft: 15,
          paddingRight: 15,
          padding: 15,
        }}
      >
        {image.description}
      </Text>
    );
  }

  renderRow = ({item, index}) => {
    const {width, height} = this.state;
    let page = this.props.renderPage(item, index);
    const layout = {
      width, height, position: 'relative',
    };
    const style = page.props.style ? [page.props.style, layout] : layout;
    let newProps = {...page.props, ref: page.ref, style};
    const element = React.createElement(page.type, newProps);
    if (this.props.pageMargin > 0 && index > 0) {
      return (
        <View style={{width: width + this.props.pageMargin, height: height, alignItems: 'flex-end'}}>
          {element}
        </View>
      );
    } else {
      return element;
    }
  };

}
