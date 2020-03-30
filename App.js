import React, {Component} from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, YellowBox, Image, TextInput, StatusBar } from 'react-native';
import * as Permissions from 'expo-permissions';
import { Header, Icon, Button } from 'react-native-elements';
import UploadingOverlay from './components/UploadingOverlay';
import firebase from './config/Firebase';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as jpeg from 'jpeg-js';
import * as tf from '@tensorflow/tfjs';
import { fetch } from '@tensorflow/tfjs-react-native';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as ImageManipulator from 'expo-image-manipulator';

// import 'react-native-get-random-values';
// import uuid from 'uuid';


const VISION_API_KEY = "AIzaSyC4u5OHO-ZliWNyK7Sx03kvT75J_QbeK5E";

let BASE64_MARKER = ';base64,';

function convertDataURIToBinary(dataURI) {
  var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  var base64 = dataURI.substring(base64Index);
  var raw = window.atob(base64);
  var rawLength = raw.length;
  var array = new Uint8Array(new ArrayBuffer(rawLength));

  for(i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

// YellowBox.ignoreWarnings(['Setting a timer'])

async function uploadImageAsync(uri) {
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = function() {
      resolve(xhr.response)
    }
    xhr.onerror = function(e) {
      console.log(e)
      reject(new TypeError('Network request failed'))
    }
    xhr.responseType = 'blob'
    xhr.open('GET', uri, true)
    xhr.send(null)
  })

  const ref = firebase
    .storage()
    .ref()
    .child("e3804b81-04eb-4ae1-aa3b-d8c77f2ff17c")
  const snapshot = await ref.put(blob)

  blob.close()

  return await snapshot.ref.getDownloadURL()
}

class App extends Component {
  state = {
    hasGrantedCameraPermission: false,
    hasGrantedCameraRollPermission: false,
    image: null,
    uploading: false,
    isTfReady: false,
    isModelReady: false,
    predictions: null,
    // image: null,
    imageURL: '',
    imageBinary: ''
  }

  async componentDidMount() {
    this.cameraRollAccess()
    this.cameraAccess()

    await tf.ready()
    this.setState({
      isTfReady: true
    })
    this.model = await mobilenet.load()
    this.setState({ isModelReady: true })
    this.getPermissionAsync()
  }

  handleURL = (text) => {
    this.setState({ imageURL: text })
 }

 getPermissionAsync = async () => {
  if (Constants.platform.ios) {
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL)
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!')
    }
  }
}

imageToTensor(rawImageData) {
  const TO_UINT8ARRAY = true
  const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY)
  // Drop the alpha channel info for mobilenet
  const buffer = new Uint8Array(width * height * 3)
  let offset = 0 // offset into original data
  for (let i = 0; i < buffer.length; i += 3) {
    buffer[i] = data[offset]
    buffer[i + 1] = data[offset + 1]
    buffer[i + 2] = data[offset + 2]

    offset += 4
  }

  return tf.tensor3d(buffer, [height, width, 3])
}

classifyImage = async () => {
  try {
    // const imageAssetPath = Image.resolveAssetSource(this.state.image)
    const response = await fetch( this.state.image, {}, { isBinary: true }) // aici downloadezi imagine in binary
    const rawImageData = await response.arrayBuffer() // daca gasesti o metoda similara sa iti ia imaginea din galeria telefonului
    const imageTensor = this.imageToTensor(rawImageData)
    const predictions = await this.model.classify(imageTensor)
    this.setState({ predictions })
    console.log(predictions)
  } catch (error) {
    console.log(error)
  }
}

selectImage = async () => {
      this.classifyImage()
}

renderPrediction = prediction => {
  return (
    <Text key={prediction.className} style={styles.text}>
      {prediction.className}
    </Text>
  )
}

















  cameraRollAccess = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL)
    // console.log('camera roll status', status)
    if (status === 'granted') {
      this.setState({ hasGrantedCameraRollPermission: true })
    }
  }

  cameraAccess = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)
    // console.log('camera status', status)
    if (status === 'granted') {
      this.setState({ hasGrantedCameraPermission: true })
    }
  }

  takePhoto = async () => {
    let pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3]
    })

    this.handleImagePicked(pickerResult)
  }

  pickImage = async () => {
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3]
    })

    this.handleImagePicked(pickerResult)
  }

  handleImagePicked = async pickerResult => {
    try {
      this.setState({ uploading: true })

      if (!pickerResult.cancelled) {
        // uploadUrl = await uploadImageAsync(pickerResult.uri) // upoad image by uri
        
         imageBase = await ImageManipulator.manipulateAsync(pickerResult.uri, [], { base64: true })
        // image8Bin = this.convertDataURIToBinary(imageBase);
         uploadUrl = await uploadImageAsync(imageBase.uri) // upoad image by uri
        // console.log('base64res' + JSON.stringify(imageMan));

        




        // uploadByte = await uploadImageAsync(pickerResult.imageBinary)
        // get imagebinary from uri
        /*
        const RNFS = require("react-native-fs");
        RNFS.readFile(response.uri, "base64").then(data => {
          console.log(data);
        });*/
        // tensor....
        // console.log(uploadUrl);
        // console.log(uploadByte)
        // console.log(image8Bin);
         this.setState({ image: uploadUrl })
         this.setState({ imageBinary: imageBase })
        // this.setState({imageBinary: imageBase})
        // this.setState({imageBinary: uploadByte})
      }
    } catch (error) {
      console.log(error)
      alert('Image Upload failed')
    } finally {
      this.setState({ uploading: false })
    }
  }

  

  



/*
  renderImage = () => {
    let { image, googleResponse, } = this.state
    if (!image) {
      return (
        <View style={styles.renderImageContainer}>
        </View>
      )
    }

    return (
      <View style={styles.renderImageContainer}>
      </View>
    )
  }
*/

  render() {

    const { isTfReady, isModelReady, predictions, image, imageBinary, response } = this.state

    const {
      hasGrantedCameraPermission,
      hasGrantedCameraRollPermission,
      uploading
    } = this.state

    if (
      hasGrantedCameraPermission === false &&
      hasGrantedCameraRollPermission === false
    ) {
      return (
        <View style={{ flex: 1, marginTop: 100 }}>
          <Text>No access to Camera or Gallery!</Text>
        </View>
      )
    } else {
      return (

        <View style={styles.container}>
          <Header
            statusBarProps={{ barStyle: 'light-content' }}
            backgroundColor='#171f24'
            leftComponent={
              <TouchableOpacity onPress={this.pickImage}>
                <Icon name='photo-album' color='#fff' />
              </TouchableOpacity>
            }
            centerComponent={{
              text: 'Image Classification',
              style: styles.headerCenter
            }}
            rightComponent={
              <TouchableOpacity onPress={this.takePhoto}>
                <Icon name='camera-alt' color='#fff' />
              </TouchableOpacity>
            }
          />
          {/* {this.renderImage()} */}
          {uploading ? <UploadingOverlay /> : null}

          <StatusBar barStyle='light-content' />
        <View style={styles.loadingContainer}>
          <Text style={styles.text}>
            TFJS ready? {isTfReady ? <Text>✅</Text> : ''}
          </Text>

          <View style={styles.loadingModelContainer}>
            <Text style={styles.text}>Model ready? </Text>
            {isModelReady ? (
              <Text style={styles.text}>✅</Text>
            ) : (
              <ActivityIndicator size='small' />
            )}
          </View>
        </View>
        

        {/* <TextInput
      style={{ color: 'white',height: 50, width: 250 ,borderColor: 'gray', borderWidth: 1 }}
      onChangeText={this.handleURL}
    /> */}
    
            {/* <Text style={{color: 'white', margin: 20}}>{this.state.imageURL}</Text> */}



          <TouchableOpacity
          style={styles.imageWrapper}
          onPress={isModelReady ? this.selectImage : undefined}>

          {image && <Image source={imageBinary} style={styles.imageContainer} />}

          {/* {isModelReady && image && (
            <Text style={styles.transparentText}>Tap to choose image</Text>
          )} */}

          <Text style={{color:'white'}}>Take a photo and press here to predict</Text>
        </TouchableOpacity> 

        <View style={styles.predictionWrapper}>
          {isModelReady  && (
            <Text style={styles.text}>
              Predictions: {predictions ? '' : 'Predicting...'}
            </Text>
          )}
          {isModelReady &&
            predictions &&
            predictions.map(p => this.renderPrediction(p))}
        </View>
        </View>



      )
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171f24',
    alignItems: 'center'
  },
  headerCenter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  renderImageContainer: {
    marginTop: 20,
    alignItems: 'center'
  },
  button: {
    backgroundColor: '#97caef',
    borderRadius: 10,
    width: 300,
    height: 300
  },
  buttonTitle: {
    fontWeight: '600'
  },
  imageContainer: {
    margin: 0,
    alignItems: 'center'
  },
  imageDisplay: {
    width: 300,
    height: 300
  },
  title: {
    fontSize: 36
  },
  hotdogEmoji: {
    marginTop: 20,
    fontSize: 90
  },
  loadingContainer: {
    marginTop: 50,
    justifyContent: 'center'
  },
  text: {
    color: '#ffffff',
    fontSize: 16
  },
  loadingModelContainer: {
    flexDirection: 'row',
    marginTop: 10
  },
  imageWrapper: {
    width: 300,
    height: 300,
    padding: 0,
    borderColor: '#cf667f',
    borderWidth: 5,
    borderStyle: 'dashed',
    marginTop: 10,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageContainer: {
    width: 270,
    height: 270,
    position: 'absolute',
    top: 10,
    left: 10,
    bottom: 10,
    right: 10
  },
  predictionWrapper: {
    height: 100,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center'
  },
  transparentText: {
    color: '#ffffff',
    opacity: 0.7
  },
  footer: {
    marginTop: 40
  },
  poweredBy: {
    fontSize: 20,
    color: '#e69e34',
    marginBottom: 6
  },
  tfLogo: {
    width: 125,
    height: 70
  }
})

export default App;