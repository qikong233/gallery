/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';
import ZoomImage from './zoomimage/index';


export default class App extends Component {
  render() {

    const image = {source: {uri: 'http://p10.qhimg.com/t019e9cf51692f735be.jpg'}};
    return (
      // <Gallery 
      //   style={{flex: 1, backgroundColor: 'skyblue'}}
      //   images={[
      //     {source: {uri: 'http://p10.qhimg.com/t019e9cf51692f735be.jpg'}},
      //     {source: {uri: 'http://ww2.sinaimg.cn/mw690/714a59a7tw1dxqkkg0cwlj.jpg'}},
      //     {source: {uri: 'http://www.bz55.com/uploads/allimg/150122/139-150122145421.jpg'}}
      //   ]}
      // />
      <ZoomImage 
        style={{flex: 1, backgroundColor: 'skyblue'}}
        image={image}
      />
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
});
