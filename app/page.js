import Image from "next/image";
import Link from "next/link";
export default function Home() {
  return (
    <>
      <div>Home</div>
      <nav>
        <ul>
          <li>
            <Link href="auth">auth</Link>
          </li>
          <li>
            <Link href="chat">chatbot</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
