import { StatusBar, View } from "react-native";
import Header from "./Header";

export default function Layout({children}: { children: JSX.Element }) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar />
        <Header />
        {children}
      </View>
    );
}