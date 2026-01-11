import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootLayout from "./_layout";
import { TcpProvider } from "./contexts/tcpContext";


export default function Index() {

    return (
        <SafeAreaProvider>
            <TcpProvider>
                <NavigationContainer>
                    <RootLayout />
                </NavigationContainer>
            </TcpProvider>
        </SafeAreaProvider>
    )
}