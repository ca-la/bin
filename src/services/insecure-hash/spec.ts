import tape from "tape";
import { test } from "../../test-helpers/simple";
import { insecureHash } from ".";

test("insecureHash returns the same hash for the same input", async (t: tape.Test) => {
  const res1 = insecureHash("Hello World");
  const res2 = insecureHash("Hello World");
  t.equal(res1, res2);
  t.equal(
    res1,
    "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
  );
});

test("insecureHash returns different hashes for different inputs", async (t: tape.Test) => {
  const longString =
    'eD30i/a0(5m?FlPbc8L:qe|R3HqwZkeR&t;aG1Cq@S}ZXm<nrXGH$?sYqO#/|j;mt)8a"2)MMV[W+ZqZ#O=y06kez5X!TCeXeXFH;wSIn$k?;mofYogec0tj9L4cWlMm}D_FO3>YMVt78^@iUU%GY5FNm6N]>*Wi^qOJ~he0CPXDq90b~c4xZ0%BPSu0mlYio)O0L{PH%MH?Enmlu59,3?JTHU>=**"k"!TKXke#4KQXm{Qmfl3L3!)f#0#wvddTz+JK<:e}NCv~k1b^Z|x~5#jH3zS(O{p~wU3A6ou<4$&O]hYk)52ahb1xJ&/JF(R4wXhs+*ddI|+3OlZ,G|x~5lN6OB.SF$ek,R.Iw,*f#%/@Vj,lZGK8Q0e1~1wbIfXdZeWLp%P;+wb9Qhz&1L[8ev&.+<j^i,D2EZ7nHM7b6z64q<OufvlMYINr@&]VPCX~2^!K0NS"F@7ee#Rg2*82up%4<Zw[n]w2<|5r;R[8^C#k9fO<q4XB>1miUDaP+JC.[>8YF$aDwXdpz*';

  const res1 = insecureHash(longString);
  const res2 = insecureHash(`${longString}-i`);
  t.notEqual(res1, res2);
});
