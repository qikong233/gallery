

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import Gallery from './gallery/index';

export default class  extends Component {
  render() {
    const {width, height} = Dimensions.get('window');
    const load = (
      <Text style={{
        fontSize: 20,
        color: 'white',
      }}>
        Loading ...
      </Text>
    );

    const error = (<Text style={{color: 'white'}}>Oh!Please Check the Image URL!</Text>);
    return (
      <Gallery 
        style={{flex: 1, backgroundColor: 'black'}}
        pageMargin={5}
        errorComponent={error}
        loadComponent={load}
        images={[
          {
            source: {uri: 'http://imglf3.nosdn.127.net/img/VXZVRTdLdlROdm1BYzdyL0JvSDlZbmJCMS9BTzV1WFkwZHhuRlAwSlQ4WWtOQWs5Vmp0QnB3PT0.jpg?imageView&thumbnail=500x0&quality=96&stripmeta=0&type=jpg'},
            description: '人像 一',
          },
          {
            source: {uri: 'http://imglf6.nosdn.127.net/img/VXZVRTdLdlROdm1BYzdyL0JvSDlZdVBrTmhVdHh3MHR4Uk5MNFJjSGNkVUdjallkVE5HZGdBPT0.jpg?imageView&thumbnail=500x0&quality=96&stripmeta=0&type=jpg'},
            description: '人像 二',
          },
          {
            source: {uri: 'http://1.png'},
            description: '错误展示 Error Component',
          },
          {
            source: {uri: 'http://imglf4.nosdn.127.net/img/NkNUdm9pWmM5d2pxT0VVMnB4dmlXMS9TTklxMXZiZTV2bkd5a3YxeG9xNUhsNnozT2JxTFZnPT0.jpg?imageView&thumbnail=500x0&quality=96&stripmeta=0&type=jpg'},
            description: '猫片 一',
          },
        ]}
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
