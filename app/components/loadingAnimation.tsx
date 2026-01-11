import LottieView from 'lottie-react-native';
import { View, StyleSheet } from 'react-native';

export default function LoadingAnimation() {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../../assets/spinners/loading.json')}
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: 120,
    height: 120,
  },
});
