import { convert } from "./convert.ts";
import { assertSnapshot } from "./deps/testing.ts";

Deno.test("convert", async (t) => {
  await t.step("one project", async (t) => {
    await t.step(
      "逆・順・双方向・空リンク+中身あり・空headword+複数パス2 hop links",
      async (t) => {
        await assertSnapshot(
          t,
          convert("takker-dist", {
            "id": "63ab57239db1b2001edc43b0",
            "title": "B",
            "image": null,
            "descriptions": [
              "[B1], [B2], [B3]",
              "[A1]",
              "https://scrapbox.io/api/pages/takker-dist/B",
            ],
            "user": {
              "id": "5ef2bdebb60650001e1280f0",
              "name": "takker",
              "displayName": "takker",
              "photo":
                "https://lh3.googleusercontent.com/a/AEdFTp5ZjA62crJpg6_eUg0wkIvPXm36hWWC3gyzzuZZ=s96-c",
            },
            "pin": 0,
            "views": 5,
            "linked": 1,
            "commitId": "63b93444aded4c001e09d134",
            "created": 1672173349,
            "updated": 1673081924,
            "accessed": 1673257686,
            "snapshotCreated": 1673081924,
            "snapshotCount": 1,
            "pageRank": 1.8,
            "lastAccessed": 1673257686,
            "persistent": true,
            "lines": [{
              "id": "63ab57239db1b2001edc43b0",
              "text": "B",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1672173349,
              "updated": 1672173349,
            }, {
              "id": "63ab57261280f000002d941d",
              "text": "[B1], [B2], [B3]",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1672173349,
              "updated": 1672173361,
            }, {
              "id": "63ab575f1280f000002d941f",
              "text": "[A1]",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1672173407,
              "updated": 1672173410,
            }, {
              "id": "63ab57271280f000002d941e",
              "text": "https://scrapbox.io/api/pages/takker-dist/B",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1672173351,
              "updated": 1673081924,
            }, {
              "id": "63b934441280f00000606f45",
              "text": "",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1673081924,
              "updated": 1673081924,
            }],
            "links": ["B1", "B2", "B3", "A1"],
            "projectLinks": [],
            "icons": [],
            "files": [],
            "relatedPages": {
              "links1hop": [{
                "id": "63b933f82895b8001d9f5cd1",
                "title": "B1",
                "titleLc": "b1",
                "image": null,
                "descriptions": ["[B]"],
                "linksLc": ["b"],
                "linked": 4,
                "updated": 1673081852,
                "accessed": 1673082412,
              }],
              "links2hop": [{
                "id": "63ab5703d28d9b001d611a14",
                "title": "A",
                "titleLc": "a",
                "image": null,
                "descriptions": [
                  "[A1],[A2],[A3]",
                  "https://scrapbox.io/api/pages/takker-dist/A",
                ],
                "linksLc": ["a1"],
                "linked": 0,
                "updated": 1672173548,
                "accessed": 1673081915,
              }, {
                "id": "63ab57bd101f5f001ee7125c",
                "title": "C",
                "titleLc": "c",
                "image": null,
                "descriptions": ["[C1], [C2], [C3]", "[A2], [A3]", "[B1]"],
                "linksLc": ["b1"],
                "linked": 0,
                "updated": 1673081866,
                "accessed": 1673081862,
              }, {
                "id": "63b93413cb7e16001e1143af",
                "title": "D",
                "titleLc": "d",
                "image": null,
                "descriptions": ["[B1]"],
                "linksLc": ["b1"],
                "linked": 0,
                "updated": 1673081879,
                "accessed": 1673081876,
              }, {
                "id": "63b9343133a85a001ea1d3c3",
                "title": "E",
                "titleLc": "e",
                "image": null,
                "descriptions": ["[B1], [B2]"],
                "linksLc": ["b1", "b2"],
                "linked": 0,
                "updated": 1673081909,
                "accessed": 1673081906,
              }],
              "projectLinks1hop": [],
              "hasBackLinksOrIcons": true,
            },
            "collaborators": [],
          }),
        );
      },
    );

    await t.step(
      "(逆リンク|順リンク|双方向リンク)+2 hop links",
      async (t) => {
        await assertSnapshot(
          t,
          convert("takker-dist", {
            "id": "63c0afb552e241001d99bfac",
            "title": "I",
            "image": null,
            "descriptions": [
              "[B] [B1] [K]",
              "https://scrapbox.io/api/pages/takker-dist/I",
            ],
            "user": {
              "id": "5ef2bdebb60650001e1280f0",
              "name": "takker",
              "displayName": "takker",
              "photo":
                "https://lh3.googleusercontent.com/a/AEdFTp5ZjA62crJpg6_eUg0wkIvPXm36hWWC3gyzzuZZ=s96-c",
            },
            "pin": 0,
            "views": 2,
            "linked": 2,
            "commitId": "63c0b03b6ecf16001dddeeff",
            "created": 1673572279,
            "updated": 1673572411,
            "accessed": 1673572394,
            "snapshotCreated": null,
            "snapshotCount": 0,
            "pageRank": 0,
            "lastAccessed": 1673572394,
            "persistent": true,
            "lines": [{
              "id": "63c0afb552e241001d99bfac",
              "text": "I",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1673572279,
              "updated": 1673572279,
            }, {
              "id": "63c0afb71280f00000e9bae0",
              "text": "[B] [B1] [K]",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1673572279,
              "updated": 1673572397,
            }, {
              "id": "63c0afb81280f00000e9bae1",
              "text": "https://scrapbox.io/api/pages/takker-dist/I",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1673572279,
              "updated": 1673572411,
            }, {
              "id": "63c0b03c1280f00000e9bae6",
              "text": "",
              "userId": "5ef2bdebb60650001e1280f0",
              "created": 1673572411,
              "updated": 1673572411,
            }],
            "links": ["B", "B1", "K"],
            "projectLinks": [],
            "icons": [],
            "files": [],
            "relatedPages": {
              "links1hop": [{
                "id": "63c0affc1d7546001dfa9f9a",
                "title": "J",
                "titleLc": "j",
                "image": null,
                "descriptions": ["[I] [B1]"],
                "linksLc": ["i", "b1"],
                "linked": 0,
                "updated": 1673572354,
                "accessed": 1673572350,
              }, {
                "id": "63c0b022d59376001dc1d28c",
                "title": "K",
                "titleLc": "k",
                "image": null,
                "descriptions": ["[I] [B1]"],
                "linksLc": ["i", "b1"],
                "linked": 1,
                "updated": 1673572392,
                "accessed": 1673572387,
              }, {
                "id": "63ab57239db1b2001edc43b0",
                "title": "B",
                "titleLc": "b",
                "image": null,
                "descriptions": [
                  "[B1], [B2], [B3]",
                  "[A1]",
                  "https://scrapbox.io/api/pages/takker-dist/B",
                ],
                "linksLc": ["b1", "b2", "b3", "a1"],
                "linked": 2,
                "updated": 1673081924,
                "accessed": 1673572196,
              }, {
                "id": "63b933f82895b8001d9f5cd1",
                "title": "B1",
                "titleLc": "b1",
                "image": null,
                "descriptions": ["[B]"],
                "linksLc": ["b"],
                "linked": 7,
                "updated": 1673081852,
                "accessed": 1673082412,
              }],
              "links2hop": [{
                "id": "63ab57bd101f5f001ee7125c",
                "title": "C",
                "titleLc": "c",
                "image": null,
                "descriptions": ["[C1], [C2], [C3]", "[A2], [A3]", "[B1]"],
                "linksLc": ["b1"],
                "linked": 0,
                "updated": 1673081866,
                "accessed": 1673572247,
              }, {
                "id": "63b93413cb7e16001e1143af",
                "title": "D",
                "titleLc": "d",
                "image": null,
                "descriptions": ["[B1]"],
                "linksLc": ["b1"],
                "linked": 0,
                "updated": 1673081879,
                "accessed": 1673572239,
              }, {
                "id": "63b9343133a85a001ea1d3c3",
                "title": "E",
                "titleLc": "e",
                "image": null,
                "descriptions": ["[B1], [B2]"],
                "linksLc": ["b1"],
                "linked": 0,
                "updated": 1673081909,
                "accessed": 1673572199,
              }],
              "projectLinks1hop": [],
              "hasBackLinksOrIcons": true,
            },
            "collaborators": [],
          }),
        );
      },
    );
  });
  await t.step("two projects", async (t) => {
    await t.step("逆・順・双方向External links", async (t) => {
      await assertSnapshot(
        t,
        convert("takker-dist", {
          "id": "63bd16afdb71fb001d058f0e",
          "title": "F",
          "image": null,
          "descriptions": [
            "[/takker-dist2/B]",
            "[/takker-dist2/C]",
            "[/takker-dist2/G]",
            "https://scrapbox.io/api/pages/takker-dist/F",
          ],
          "user": {
            "id": "5ef2bdebb60650001e1280f0",
            "name": "takker",
            "displayName": "takker",
            "photo":
              "https://lh3.googleusercontent.com/a/AEdFTp5ZjA62crJpg6_eUg0wkIvPXm36hWWC3gyzzuZZ=s96-c",
          },
          "pin": 0,
          "views": 3,
          "linked": 0,
          "commitId": "63bd174061a69e001e7d9d74",
          "created": 1673336497,
          "updated": 1673336640,
          "accessed": 1673336624,
          "snapshotCreated": null,
          "snapshotCount": 0,
          "pageRank": 0,
          "lastAccessed": 1673336624,
          "persistent": true,
          "lines": [{
            "id": "63bd16afdb71fb001d058f0e",
            "text": "F",
            "userId": "5ef2bdebb60650001e1280f0",
            "created": 1673336497,
            "updated": 1673336497,
          }, {
            "id": "63bd16b11280f00000b00965",
            "text": "[/takker-dist2/B]",
            "userId": "5ef2bdebb60650001e1280f0",
            "created": 1673336497,
            "updated": 1673336501,
          }, {
            "id": "63bd16b51280f00000b00966",
            "text": "[/takker-dist2/C]",
            "userId": "5ef2bdebb60650001e1280f0",
            "created": 1673336501,
            "updated": 1673336571,
          }, {
            "id": "63bd17041280f00000b0096b",
            "text": "[/takker-dist2/G]",
            "userId": "5ef2bdebb60650001e1280f0",
            "created": 1673336580,
            "updated": 1673336595,
          }, {
            "id": "63bd17111280f00000b0096c",
            "text": "https://scrapbox.io/api/pages/takker-dist/F",
            "userId": "5ef2bdebb60650001e1280f0",
            "created": 1673336594,
            "updated": 1673336640,
          }, {
            "id": "63bd17401280f00000b0096e",
            "text": "",
            "userId": "5ef2bdebb60650001e1280f0",
            "created": 1673336640,
            "updated": 1673336640,
          }],
          "links": [],
          "projectLinks": [
            "/takker-dist2/B",
            "/takker-dist2/C",
            "/takker-dist2/G",
          ],
          "icons": [],
          "files": [],
          "relatedPages": {
            "links1hop": [],
            "links2hop": [],
            "projectLinks1hop": [{
              "id": "63bd169823cbed001d092543",
              "title": "B",
              "titleLc": "b",
              "image": null,
              "descriptions": ["[B1] [B2]"],
              "linked": 0,
              "updated": 1673336514,
              "accessed": 1673336473,
              "projectName": "takker-dist2",
            }, {
              "id": "63bd16c41933fc001d0f9dca",
              "title": "C",
              "titleLc": "c",
              "image": null,
              "descriptions": ["[/takker-dist/F]"],
              "linked": 0,
              "updated": 1673336584,
              "accessed": 1673336577,
              "projectName": "takker-dist2",
            }, {
              "id": "63bd1684ca5336001d6417d9",
              "title": "A",
              "titleLc": "a",
              "image": null,
              "descriptions": ["[/takker-dist/F]"],
              "linked": 0,
              "updated": 1673336561,
              "accessed": 1673336529,
              "projectName": "takker-dist2",
            }],
            "hasBackLinksOrIcons": false,
          },
          "collaborators": [],
        }),
      );
    });
  });
});
