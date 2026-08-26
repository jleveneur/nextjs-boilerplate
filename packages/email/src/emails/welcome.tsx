import { Body, Container, Head, Heading, Html, Preview, Text } from "react-email";

export type WelcomeEmailProps = {
  name: string;
  appName?: string;
};

export function WelcomeEmail({ name, appName = "App" }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {appName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Welcome, {name}</Heading>
          <Text style={text}>Your account is ready. Sign in to get started.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

const body = {
  backgroundColor: "#f6f6f6",
  fontFamily: "Helvetica, Arial, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "24px",
  maxWidth: "480px",
};

const heading = {
  fontSize: "22px",
  margin: "0 0 16px",
};

const text = {
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0",
};
