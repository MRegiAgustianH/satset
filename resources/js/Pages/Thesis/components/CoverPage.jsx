import React from 'react';
import { GraduationCap } from 'lucide-react';

export default function CoverPage({ coverElements = [] }) {
  return (
    <div className="page-content flex h-full w-full flex-col items-center justify-start border border-dashed border-indigo-500/10">
      <div className="flex w-full flex-col items-center text-center">
        {coverElements.map((element) => {
          if (element.type === 'spacing') {
            return <div key={element.id} className="w-full" style={{ height: element.height || '1cm' }} />;
          }

          if (element.type === 'logo') {
            const logoSize = element.size || '5cm';

            return (
              <div key={element.id} className="my-2 flex w-full justify-center text-center" align="center">
                {element.logoType === 'custom' && element.logoData ? (
                  <img
                    src={element.logoData}
                    className="object-contain"
                    style={{ maxHeight: logoSize, maxWidth: logoSize }}
                    alt="Logo Kustom"
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50/50"
                    style={{ height: logoSize, width: logoSize }}
                  >
                    <GraduationCap className="h-20 w-20 text-indigo-500" />
                  </div>
                )}
              </div>
            );
          }

          const textStyle = {
            fontSize: element.fontSize || '12pt',
            fontWeight: element.bold ? 'bold' : 'normal',
            fontStyle: element.italic ? 'italic' : 'normal',
            textDecoration: element.underline ? 'underline' : 'none',
            textTransform: element.uppercase ? 'uppercase' : 'none',
            lineHeight: '1.5',
            margin: '0',
            padding: '0',
            fontFamily: 'var(--doc-font-family)',
          };

          if (element.type === 'title') {
            return (
              <h1
                key={element.id}
                className="mx-auto w-full max-w-[15.5cm] break-words text-center font-bold tracking-wide"
                style={textStyle}
              >
                {element.value}
              </h1>
            );
          }

          return (
            <p key={element.id} className="w-full break-words text-center" style={textStyle}>
              {element.value}
            </p>
          );
        })}
      </div>
    </div>
  );
}
