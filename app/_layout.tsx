import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SecureKeyProvider } from "./contexts/secureKeyContext";
import { TcpProvider } from "./contexts/tcpContext";
import { UdpProvider } from "./contexts/udpContext";

import { StyleSheet } from "react-native";
import { themes } from "./styles/themes";
import { ConnectionStatusProvider } from "./contexts/connectionStatusContext";


export type RootStackParamList = {
    default: undefined;
    controller: undefined; 
}

const Stack = createNativeStackNavigator<RootStackParamList>();


export default function RootLayout() {

    const insets = useSafeAreaInsets();
    const style_sheet = StyleSheet.create({
        container:{
            width:"100%",
            height:"100%",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
            backgroundColor: themes["default"].background
        }
    });
    

    return (
        <SafeAreaProvider>
            <GestureHandlerRootView style={{flex:1}}>
                <ConnectionStatusProvider><UdpProvider><TcpProvider><SecureKeyProvider>
                    <Stack.Navigator 
                        initialRouteName="default"
                        screenOptions={{
                            headerShown:false,
                            presentation: 'transparentModal',
                            contentStyle: style_sheet.container
                        }}
                    >
                        <Stack.Screen name="default" component={require("./pages/default").Default} />
                        <Stack.Screen name="controller" component={require("./pages/controller").Controller} />
                    </Stack.Navigator>
                </SecureKeyProvider></TcpProvider></UdpProvider></ConnectionStatusProvider>
            </GestureHandlerRootView>
        </SafeAreaProvider>
    );
}
